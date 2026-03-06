import { randomUUID } from "node:crypto";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { db } from "../db/client.ts";
import { cartItems as cartItemsTable, cartSessions as cartSessionsTable } from "../db/menu-schema.ts";
import { computeCheckoutTotal } from "../pricing.ts";
import { getAdminItemDetail, getPublicItemDetail } from "../menu/store.ts";
import { CartValidationError, ORDER_TYPES, OrderType } from "./validation.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TAX_RATE = 0.085;
export const TAX_INCLUDED_IN_MENU_PRICES = true;
export const DELIVERY_BASE_FEE = 3.99;
export const DELIVERY_FREE_THRESHOLD = 35;
export const MINIMUM_ORDER_TOTALS: Record<string, number> = {
  [ORDER_TYPES.DELIVERY]: 15,
  [ORDER_TYPES.DINE_IN]: 0,
  [ORDER_TYPES.PICKUP]: 0,
};

// ---------------------------------------------------------------------------
// In-memory order store (orders persist until server restart — intentional)
// ---------------------------------------------------------------------------

const ORDERS_KEY = "__FOODAPP_ORDERS__";

interface OrderStore {
  nextOrderNumber: number;
  ordersByPublicId: Map<string, Order>;
}

function ensureOrderStore(): OrderStore {
  const g = globalThis as Record<string, unknown>;
  if (!g[ORDERS_KEY]) {
    g[ORDERS_KEY] = { nextOrderNumber: 2001, ordersByPublicId: new Map() };
  }
  return g[ORDERS_KEY] as OrderStore;
}

function nextOrderPublicId(): string {
  const store = ensureOrderStore();
  const id = `ORD-${store.nextOrderNumber}`;
  store.nextOrderNumber += 1;
  return id;
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface CartLine {
  id: string;
  itemId: string;
  quantity: number;
  selectedOptionIds: string[];
  specialInstructions: string;
  itemNameSnapshot: string;
  basePriceSnapshot: number;
  modifierTotalSnapshot: number;
  unitPriceSnapshot: number;
  createdAt: string;
  updatedAt: string;
}

interface Cart {
  ownerKey: string;
  orderType: string;
  items: CartLine[];
  deliveryAddress: DeliveryAddressData | null;
  createdAt: string;
  updatedAt: string;
}

interface DeliveryAddressData {
  line1: string;
  city: string;
  postalCode: string;
  notes: string;
}

interface SelectedModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
}

interface ModifierGroupView {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  options: Array<{
    id: string;
    name: string;
    priceDelta: number;
    isActive: boolean;
    selected: boolean;
  }>;
}

interface CartLineView {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  specialInstructions: string;
  selectedOptionIds: string[];
  selectedModifiers: SelectedModifier[];
  modifierGroups: ModifierGroupView[];
  basePrice: number;
  modifierTotal: number;
  unitPrice: number;
  lineTotal: number;
  availability: "active" | "inactive";
  validationIssues: string[];
}

interface CartSnapshot {
  orderType: string;
  itemCount: number;
  subtotal: number;
  hasValidationIssues: boolean;
  items: CartLineView[];
  deliveryAddress: DeliveryAddressData | null;
  updatedAt: string;
}

interface CheckoutSummary {
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  total: number;
  taxRate: number;
  taxIncludedInMenuPrices: boolean;
  currency: string;
}

interface PreparedCheckout {
  orderType: string;
  paymentMethod: string | undefined;
  minimumOrderTotal: number;
  deliveryAddress: DeliveryAddressData | null;
  items: CartLineView[];
  summary: CheckoutSummary;
}

interface Order {
  id: string;
  userId: string;
  userEmail: string;
  orderType: string;
  paymentMethod: string | undefined;
  summary: CheckoutSummary;
  minimumOrderTotal: number;
  deliveryAddress: DeliveryAddressData | null;
  items: CartLineView[];
  status: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// DB helpers — datetime formatting
// ---------------------------------------------------------------------------

function mysqlNow(): string {
  return new Date().toISOString().replace("T", " ").replace("Z", "").slice(0, 23);
}

function isoToMysql(iso: string): string {
  return iso.replace("T", " ").replace("Z", "").slice(0, 23);
}

function mysqlToIso(s: string): string {
  if (!s) return new Date().toISOString();
  return s.includes("T") ? s : s.replace(" ", "T") + "Z";
}

function newId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 32);
}

// ---------------------------------------------------------------------------
// DB — load / persist cart
// ---------------------------------------------------------------------------

type SessionRow = typeof cartSessionsTable.$inferSelect;
type ItemRow = typeof cartItemsTable.$inferSelect;

function itemRowToCartLine(row: ItemRow): CartLine {
  let selectedOptionIds: string[] = [];
  try { selectedOptionIds = JSON.parse(row.selectedOptionIdsJson || "[]") as string[]; } catch { /* ignore */ }
  return {
    id: row.id,
    itemId: row.itemId,
    quantity: row.quantity,
    selectedOptionIds,
    specialInstructions: row.specialInstructions,
    itemNameSnapshot: row.itemNameSnapshot,
    basePriceSnapshot: Number(row.basePriceSnapshot),
    modifierTotalSnapshot: Number(row.modifierTotalSnapshot),
    unitPriceSnapshot: Number(row.unitPriceSnapshot),
    createdAt: mysqlToIso(row.createdAt),
    updatedAt: mysqlToIso(row.updatedAt),
  };
}

function sessionRowToCart(session: SessionRow, lines: CartLine[]): Cart {
  let deliveryAddress: DeliveryAddressData | null = null;
  try {
    if (session.deliveryAddressJson) {
      deliveryAddress = JSON.parse(session.deliveryAddressJson) as DeliveryAddressData;
    }
  } catch { /* ignore */ }
  return {
    ownerKey: session.ownerKey,
    orderType: session.orderType,
    items: lines,
    deliveryAddress,
    createdAt: mysqlToIso(session.createdAt),
    updatedAt: mysqlToIso(session.updatedAt),
  };
}

async function loadSession(ownerKey: string): Promise<SessionRow | null> {
  const rows = await db.select().from(cartSessionsTable)
    .where(eq(cartSessionsTable.ownerKey, ownerKey))
    .limit(1);
  return rows[0] ?? null;
}

async function loadOrCreateSession(ownerKey: string): Promise<SessionRow> {
  const existing = await loadSession(ownerKey);
  if (existing) return existing;

  const id = newId();
  const now = mysqlNow();
  await db.insert(cartSessionsTable).values({
    id,
    ownerKey,
    orderType: ORDER_TYPES.DELIVERY,
    deliveryAddressJson: null,
    createdAt: now,
    updatedAt: now,
  });
  return { id, ownerKey, orderType: ORDER_TYPES.DELIVERY, deliveryAddressJson: null, createdAt: now, updatedAt: now };
}

async function loadCartFromDb(ownerKey: string): Promise<{ session: SessionRow; cart: Cart }> {
  const session = await loadOrCreateSession(ownerKey);
  const itemRows = await db.select().from(cartItemsTable)
    .where(eq(cartItemsTable.cartSessionId, session.id));
  const lines = itemRows.map(itemRowToCartLine);
  return { session, cart: sessionRowToCart(session, lines) };
}

async function persistCart(sessionId: string, cart: Cart): Promise<void> {
  const now = mysqlNow();

  // 1. Update session metadata
  await db.update(cartSessionsTable)
    .set({
      orderType: cart.orderType,
      deliveryAddressJson: cart.deliveryAddress ? JSON.stringify(cart.deliveryAddress) : null,
      updatedAt: now,
    })
    .where(eq(cartSessionsTable.id, sessionId));

  // 2. No items — clear the session and return
  if (cart.items.length === 0) {
    await db.delete(cartItemsTable).where(eq(cartItemsTable.cartSessionId, sessionId));
    return;
  }

  // 3. Upsert all current items (INSERT new rows, UPDATE existing ones).
  //    For a simple +1 quantity bump this only touches one row instead of
  //    deleting and re-inserting every item in the cart.
  const rows = cart.items.map((line) => ({
    id: line.id,
    cartSessionId: sessionId,
    itemId: line.itemId,
    quantity: line.quantity,
    selectedOptionIdsJson: JSON.stringify(line.selectedOptionIds),
    specialInstructions: line.specialInstructions,
    itemNameSnapshot: line.itemNameSnapshot,
    basePriceSnapshot: String(line.basePriceSnapshot),
    modifierTotalSnapshot: String(line.modifierTotalSnapshot),
    unitPriceSnapshot: String(line.unitPriceSnapshot),
    createdAt: isoToMysql(line.createdAt),
    updatedAt: now,
  }));

  await db.insert(cartItemsTable).values(rows).onDuplicateKeyUpdate({
    set: {
      quantity:              sql`VALUES(quantity)`,
      selectedOptionIdsJson: sql`VALUES(selected_option_ids_json)`,
      specialInstructions:   sql`VALUES(special_instructions)`,
      itemNameSnapshot:      sql`VALUES(item_name_snapshot)`,
      basePriceSnapshot:     sql`VALUES(base_price_snapshot)`,
      modifierTotalSnapshot: sql`VALUES(modifier_total_snapshot)`,
      unitPriceSnapshot:     sql`VALUES(unit_price_snapshot)`,
      updatedAt:             sql`VALUES(updated_at)`,
    },
  });

  // 4. Delete rows that are no longer in the cart (item removed).
  //    Skipped when the item count didn't decrease (common path).
  const currentIds = cart.items.map((l) => l.id);
  await db.delete(cartItemsTable).where(
    and(
      eq(cartItemsTable.cartSessionId, sessionId),
      notInArray(cartItemsTable.id, currentIds),
    ),
  );
}

// Run fn with load-mutate-persist in one go
async function mutateCart(
  ownerKey: string,
  fn: (cart: Cart) => Promise<void> | void,
): Promise<CartSnapshot> {
  const { session, cart } = await loadCartFromDb(ownerKey);
  await fn(cart);
  await persistCart(session.id, cart);
  return toCartSnapshot(cart);
}

// ---------------------------------------------------------------------------
// Misc helpers (unchanged from original)
// ---------------------------------------------------------------------------

function roundMoney(value: number): number {
  return Number(Number(value).toFixed(2));
}

function nowIso(): string {
  return new Date().toISOString();
}

function nextUpdatedAt(previousIso: string | undefined): string {
  const nowMs = Date.now();
  const previousMs = typeof previousIso === "string" ? Date.parse(previousIso) : Number.NaN;
  if (Number.isFinite(previousMs) && nowMs <= previousMs) {
    return new Date(previousMs + 1).toISOString();
  }
  return new Date(nowMs).toISOString();
}

function normalizeQuantity(quantity: unknown): number {
  const parsed = Number.parseInt(String(quantity), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
    throw new CartValidationError("Quantity must be between 1 and 20.", 400, "INVALID_QUANTITY");
  }
  return parsed;
}

function normalizeSelectedOptionIds(selectedOptionIds: unknown): string[] {
  if (!Array.isArray(selectedOptionIds)) return [];
  const dedup: string[] = [];
  const seen = new Set<string>();
  for (const optionId of selectedOptionIds) {
    const text = String(optionId || "").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    dedup.push(text);
  }
  return dedup;
}

function normalizeSpecialInstructions(specialInstructions: unknown): string {
  const normalized = String(specialInstructions || "").trim();
  if (normalized.length > 280) {
    throw new CartValidationError(
      "Special instructions cannot exceed 280 characters.", 400, "INVALID_SPECIAL_INSTRUCTIONS",
    );
  }
  return normalized;
}

function normalizeDeliveryAddress(deliveryAddress: unknown): DeliveryAddressData {
  if (!deliveryAddress) {
    throw new CartValidationError(
      "Delivery address line1 and city are required for delivery orders.", 400, "DELIVERY_ADDRESS_REQUIRED",
    );
  }
  const addr = deliveryAddress as Record<string, unknown>;
  const line1 = String(addr.line1 || "").trim();
  const city = String(addr.city || "").trim();
  const postalCode = String(addr.postalCode || "").trim();
  const notes = String(addr.notes || "").trim();
  if (!line1 || !city) {
    throw new CartValidationError(
      "Delivery address line1 and city are required for delivery orders.", 400, "DELIVERY_ADDRESS_REQUIRED",
    );
  }
  return { line1, city, postalCode, notes };
}

function sortIds(ids: string[]): string[] {
  return [...ids].sort((a, b) => a.localeCompare(b));
}

async function resolveItemOrThrow(itemId: string): Promise<Awaited<ReturnType<typeof getPublicItemDetail>>> {
  try {
    return await getPublicItemDetail(itemId);
  } catch (error) {
    if (
      error && typeof error === "object" && "code" in error &&
      ((error as { code: string }).code === "ITEM_NOT_FOUND" ||
        (error as { code: string }).code === "CATEGORY_NOT_FOUND")
    ) {
      throw new CartValidationError("Menu item is unavailable. Please refresh your cart.", 409, "ITEM_UNAVAILABLE");
    }
    throw error;
  }
}

type ItemDetail = Awaited<ReturnType<typeof getPublicItemDetail>>;

function validateModifierSelection(
  itemDetail: ItemDetail,
  selectedOptionIds: unknown,
  { strict }: { strict: boolean },
): { selectedOptionIds: string[]; selectedModifiers: SelectedModifier[]; modifierTotal: number } {
  const selectedIds = normalizeSelectedOptionIds(selectedOptionIds);
  const optionMap = new Map<string, { group: ItemDetail["modifierGroups"][number]; option: ItemDetail["modifierGroups"][number]["options"][number] }>();
  const groupMap = new Map<string, ItemDetail["modifierGroups"][number]>();

  for (const group of itemDetail.modifierGroups) {
    groupMap.set(group.id, group);
    for (const option of group.options) optionMap.set(option.id, { group, option });
  }

  const selectedModifiers: SelectedModifier[] = [];
  const countByGroupId = new Map<string, number>();

  for (const optionId of selectedIds) {
    const match = optionMap.get(optionId);
    if (!match) {
      if (strict) throw new CartValidationError(
        "One or more selected modifiers are invalid for this item.", 400, "INVALID_MODIFIER_SELECTION",
      );
      continue;
    }
    const currentCount = countByGroupId.get(match.group.id) || 0;
    countByGroupId.set(match.group.id, currentCount + 1);
    selectedModifiers.push({
      groupId: match.group.id, groupName: match.group.name,
      optionId: match.option.id, optionName: match.option.name,
      priceDelta: roundMoney(match.option.priceDelta),
    });
  }

  for (const group of itemDetail.modifierGroups) {
    const selectedCount = countByGroupId.get(group.id) || 0;
    const requiredMin = Math.max(group.minSelect, group.isRequired ? 1 : 0);
    if (selectedCount < requiredMin || selectedCount > group.maxSelect) {
      if (strict) throw new CartValidationError(
        `Modifier selection for "${group.name}" must be between ${requiredMin} and ${group.maxSelect}.`,
        400, "MODIFIER_RULE_VIOLATION",
      );
    }
  }

  const modifierTotal = roundMoney(selectedModifiers.reduce((sum, m) => sum + m.priceDelta, 0));
  return { selectedOptionIds: sortIds(selectedModifiers.map((m) => m.optionId)), selectedModifiers, modifierTotal };
}

function toDisplayModifierGroups(itemDetail: ItemDetail, selectedOptionIds: string[]): ModifierGroupView[] {
  const selectedSet = new Set(selectedOptionIds);
  return itemDetail.modifierGroups.map((group) => ({
    id: group.id, name: group.name, isRequired: group.isRequired,
    minSelect: group.minSelect, maxSelect: group.maxSelect,
    options: group.options.map((opt) => ({
      id: opt.id, name: opt.name, priceDelta: roundMoney(opt.priceDelta),
      isActive: opt.isActive, selected: selectedSet.has(opt.id),
    })),
  }));
}

async function buildCartLineView(line: CartLine, { strict }: { strict: boolean }): Promise<CartLineView> {
  try {
    const itemDetail = await resolveItemOrThrow(line.itemId);
    const quantity = normalizeQuantity(line.quantity);
    const selection = validateModifierSelection(itemDetail, line.selectedOptionIds, { strict });
    const basePrice = roundMoney(itemDetail.basePrice);
    const unitPrice = roundMoney(basePrice + selection.modifierTotal);
    const lineTotal = roundMoney(unitPrice * quantity);
    return {
      id: line.id, itemId: line.itemId, itemName: itemDetail.name, quantity,
      specialInstructions: line.specialInstructions || "",
      selectedOptionIds: selection.selectedOptionIds,
      selectedModifiers: selection.selectedModifiers,
      modifierGroups: toDisplayModifierGroups(itemDetail, selection.selectedOptionIds),
      basePrice, modifierTotal: selection.modifierTotal, unitPrice, lineTotal,
      availability: "active", validationIssues: [],
    };
  } catch (error) {
    if (strict) throw error;
    const fallbackIssues: string[] = [];
    if (error instanceof Error) fallbackIssues.push(error.message);
    let fallbackName = line.itemNameSnapshot || "Unavailable item";
    try { const adminItem = await getAdminItemDetail(line.itemId); fallbackName = adminItem.name; } catch { /* keep snapshot */ }
    const quantity = Number.isInteger(line.quantity) ? line.quantity : 1;
    const unitPrice = roundMoney(line.unitPriceSnapshot || 0);
    return {
      id: line.id, itemId: line.itemId, itemName: fallbackName, quantity,
      specialInstructions: line.specialInstructions || "",
      selectedOptionIds: normalizeSelectedOptionIds(line.selectedOptionIds),
      selectedModifiers: [], modifierGroups: [],
      basePrice: roundMoney(line.basePriceSnapshot || 0),
      modifierTotal: roundMoney(line.modifierTotalSnapshot || 0),
      unitPrice, lineTotal: roundMoney(unitPrice * quantity),
      availability: "inactive",
      validationIssues: fallbackIssues.length > 0 ? fallbackIssues : ["Item requires attention."],
    };
  }
}

async function toCartSnapshot(cart: Cart): Promise<CartSnapshot> {
  const items = await Promise.all(cart.items.map((line) => buildCartLineView(line, { strict: false })));
  const subtotal = roundMoney(items.reduce((sum, line) => sum + line.lineTotal, 0));
  const itemCount = items.reduce((sum, line) => sum + line.quantity, 0);
  const hasValidationIssues = items.some((line) => line.validationIssues.length > 0);
  return { orderType: cart.orderType, itemCount, subtotal, hasValidationIssues, items, deliveryAddress: cart.deliveryAddress, updatedAt: cart.updatedAt };
}

function getMinimumOrderTotal(orderType: string): number {
  return MINIMUM_ORDER_TOTALS[orderType] ?? 0;
}

function computeDiscount(subtotal: number): number {
  if (subtotal >= 60) return 8;
  if (subtotal >= 40) return 4;
  return 0;
}

function computeDeliveryFee(orderType: string, subtotal: number): number {
  if (orderType !== ORDER_TYPES.DELIVERY) return 0;
  if (subtotal >= DELIVERY_FREE_THRESHOLD) return 0;
  return DELIVERY_BASE_FEE;
}

function buildCheckoutSummary({ orderType, subtotal }: { orderType: string; subtotal: number }): CheckoutSummary {
  const discount = computeDiscount(subtotal);
  const taxable = Math.max(0, subtotal - discount);
  const tax = TAX_INCLUDED_IN_MENU_PRICES
    ? roundMoney(taxable - taxable / (1 + TAX_RATE))
    : roundMoney(taxable * TAX_RATE);
  const deliveryFee = computeDeliveryFee(orderType, subtotal);
  const taxAppliedToTotal = TAX_INCLUDED_IN_MENU_PRICES ? 0 : tax;
  const total = computeCheckoutTotal({ subtotal, discount, tax: taxAppliedToTotal, deliveryFee });
  return {
    subtotal: roundMoney(subtotal), discount: roundMoney(discount), tax,
    deliveryFee: roundMoney(deliveryFee), total, taxRate: TAX_RATE,
    taxIncludedInMenuPrices: TAX_INCLUDED_IN_MENU_PRICES, currency: "EUR",
  };
}

async function prepareCheckout(
  cart: Cart,
  payload: { orderType?: string; paymentMethod?: string; deliveryAddress?: unknown },
  { user }: { user?: { addressLine1?: string | null; addressCity?: string | null } | null },
): Promise<PreparedCheckout> {
  if (!cart.items.length) throw new CartValidationError("Cart is empty.", 409, "CART_EMPTY");

  const orderType = payload.orderType || cart.orderType;
  const strictLines = await Promise.all(cart.items.map((line) => buildCartLineView(line, { strict: true })));
  const subtotal = roundMoney(strictLines.reduce((sum, line) => sum + line.lineTotal, 0));
  const minimumOrderTotal = getMinimumOrderTotal(orderType);

  if (subtotal < minimumOrderTotal) {
    throw new CartValidationError(
      `Minimum order total for ${orderType.replace("_", " ").toLowerCase()} is €${minimumOrderTotal.toFixed(2)}.`,
      409, "MINIMUM_ORDER_NOT_MET",
    );
  }

  let deliveryAddress: unknown = payload.deliveryAddress || cart.deliveryAddress;
  if (orderType === ORDER_TYPES.DELIVERY) {
    if (!deliveryAddress && user?.addressLine1 && user?.addressCity) {
      deliveryAddress = { line1: user.addressLine1, city: user.addressCity, postalCode: "", notes: "" };
    }
    const normalizedAddress = normalizeDeliveryAddress(deliveryAddress);
    return { orderType, paymentMethod: payload.paymentMethod, minimumOrderTotal, deliveryAddress: normalizedAddress, items: strictLines, summary: buildCheckoutSummary({ orderType, subtotal }) };
  }

  return { orderType, paymentMethod: payload.paymentMethod, minimumOrderTotal, deliveryAddress: null, items: strictLines, summary: buildCheckoutSummary({ orderType, subtotal }) };
}

function refreshLineSnapshots(line: CartLine, lineView: CartLineView): void {
  line.itemNameSnapshot = lineView.itemName;
  line.basePriceSnapshot = lineView.basePrice;
  line.modifierTotalSnapshot = lineView.modifierTotal;
  line.unitPriceSnapshot = lineView.unitPrice;
}

// ---------------------------------------------------------------------------
// Public API — same signatures as before
// ---------------------------------------------------------------------------

export function resetCartStoreForTests(): void {
  // No-op in DB mode (tests should use a test DB or mock)
}

export async function getCartSnapshot(ownerKey: string): Promise<CartSnapshot> {
  const { cart } = await loadCartFromDb(ownerKey);
  return toCartSnapshot(cart);
}

export async function updateCart(ownerKey: string, patch: { orderType?: string }): Promise<CartSnapshot> {
  return mutateCart(ownerKey, (cart) => {
    if (patch.orderType) cart.orderType = patch.orderType;
  });
}

export async function addCartItem(
  ownerKey: string,
  payload: { itemId: string; quantity: number; selectedOptionIds: string[]; specialInstructions: string },
): Promise<CartSnapshot> {
  return mutateCart(ownerKey, async (cart) => {
    const itemDetail = await resolveItemOrThrow(payload.itemId);
    const quantity = normalizeQuantity(payload.quantity);
    const specialInstructions = normalizeSpecialInstructions(payload.specialInstructions);
    const selection = validateModifierSelection(itemDetail, payload.selectedOptionIds, { strict: true });

    const existing = cart.items.find(
      (line) =>
        line.itemId === payload.itemId &&
        line.specialInstructions === specialInstructions &&
        JSON.stringify(normalizeSelectedOptionIds(line.selectedOptionIds)) === JSON.stringify(selection.selectedOptionIds),
    );

    if (existing) {
      existing.quantity = normalizeQuantity(existing.quantity + quantity);
      existing.selectedOptionIds = selection.selectedOptionIds;
      existing.specialInstructions = specialInstructions;
      existing.updatedAt = nextUpdatedAt(existing.updatedAt);
      const lineView = await buildCartLineView(existing, { strict: true });
      refreshLineSnapshots(existing, lineView);
    } else {
      const now = nowIso();
      cart.items.push({
        id: newId(),
        itemId: payload.itemId,
        quantity,
        selectedOptionIds: selection.selectedOptionIds,
        specialInstructions,
        itemNameSnapshot: itemDetail.name,
        basePriceSnapshot: roundMoney(itemDetail.basePrice),
        modifierTotalSnapshot: selection.modifierTotal,
        unitPriceSnapshot: roundMoney(itemDetail.basePrice + selection.modifierTotal),
        createdAt: now,
        updatedAt: now,
      });
    }
  });
}

export async function updateCartItem(
  ownerKey: string,
  cartItemId: string,
  patch: { quantity?: number; selectedOptionIds?: string[]; specialInstructions?: string },
): Promise<CartSnapshot> {
  return mutateCart(ownerKey, async (cart) => {
    const line = cart.items.find((entry) => entry.id === cartItemId);
    if (!line) throw new CartValidationError("Cart item not found.", 404, "CART_ITEM_NOT_FOUND");

    const nextQuantity = patch.quantity === undefined ? line.quantity : normalizeQuantity(patch.quantity);
    const nextInstructions = patch.specialInstructions === undefined
      ? line.specialInstructions
      : normalizeSpecialInstructions(patch.specialInstructions);
    const nextOptionIds = patch.selectedOptionIds === undefined
      ? normalizeSelectedOptionIds(line.selectedOptionIds)
      : normalizeSelectedOptionIds(patch.selectedOptionIds);

    const itemDetail = await resolveItemOrThrow(line.itemId);
    const selection = validateModifierSelection(itemDetail, nextOptionIds, { strict: true });

    line.quantity = nextQuantity;
    line.specialInstructions = nextInstructions;
    line.selectedOptionIds = selection.selectedOptionIds;
    line.updatedAt = nextUpdatedAt(line.updatedAt);

    const lineView = await buildCartLineView(line, { strict: true });
    refreshLineSnapshots(line, lineView);
  });
}

export async function removeCartItem(ownerKey: string, cartItemId: string): Promise<CartSnapshot> {
  return mutateCart(ownerKey, (cart) => {
    const index = cart.items.findIndex((entry) => entry.id === cartItemId);
    if (index < 0) throw new CartValidationError("Cart item not found.", 404, "CART_ITEM_NOT_FOUND");
    cart.items.splice(index, 1);
  });
}

export async function previewCheckout(
  ownerKey: string,
  payload: { orderType?: string; paymentMethod?: string; deliveryAddress?: { line1?: string; city?: string; postalCode?: string; notes?: string } },
  options: { user?: { addressLine1?: string | null; addressCity?: string | null } | null } = {},
): Promise<{ checkout: PreparedCheckout }> {
  const { session, cart } = await loadCartFromDb(ownerKey);
  const prepared = await prepareCheckout(cart, payload, { user: options.user });

  if (prepared.deliveryAddress) cart.deliveryAddress = prepared.deliveryAddress;
  if (prepared.orderType !== cart.orderType) cart.orderType = prepared.orderType;
  await persistCart(session.id, cart);

  return { checkout: prepared };
}

export async function placeCheckout(
  ownerKey: string,
  payload: { orderType?: string; paymentMethod?: string; deliveryAddress?: { line1?: string; city?: string; postalCode?: string; notes?: string } },
  user: { id: string; email: string; addressLine1?: string | null; addressCity?: string | null },
): Promise<{ order: Order }> {
  const { session, cart } = await loadCartFromDb(ownerKey);
  const prepared = await prepareCheckout(cart, payload, { user });

  const publicId = nextOrderPublicId();
  const timestamp = nowIso();

  const order: Order = {
    id: publicId,
    userId: user.id,
    userEmail: user.email,
    orderType: prepared.orderType,
    paymentMethod: prepared.paymentMethod,
    summary: prepared.summary,
    minimumOrderTotal: prepared.minimumOrderTotal,
    deliveryAddress: prepared.deliveryAddress,
    items: prepared.items,
    status: "ACCEPTED",
    createdAt: timestamp,
  };

  ensureOrderStore().ordersByPublicId.set(publicId, order);

  // Clear cart in DB
  cart.items = [];
  cart.orderType = ORDER_TYPES.DELIVERY;
  cart.deliveryAddress = null;
  await persistCart(session.id, cart);

  return { order };
}

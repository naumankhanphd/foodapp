import { computeCheckoutTotal } from "../pricing.mjs";
import { getAdminItemDetail, getPublicItemDetail } from "../menu/store.mjs";
import { CartValidationError, ORDER_TYPES } from "./validation.mjs";

const STORE_KEY = "__FOODAPP_CART_STORE__";

export const TAX_RATE = 0.085;
export const TAX_INCLUDED_IN_MENU_PRICES = true;
export const DELIVERY_BASE_FEE = 3.99;
export const DELIVERY_FREE_THRESHOLD = 35;
export const MINIMUM_ORDER_TOTALS = {
  [ORDER_TYPES.DELIVERY]: 15,
  [ORDER_TYPES.DINE_IN]: 0,
  [ORDER_TYPES.PICKUP]: 0,
};

function roundMoney(value) {
  return Number(Number(value).toFixed(2));
}

function nowIso() {
  return new Date().toISOString();
}

function nextUpdatedAt(previousIso) {
  const nowMs = Date.now();
  const previousMs = typeof previousIso === "string" ? Date.parse(previousIso) : Number.NaN;
  if (Number.isFinite(previousMs) && nowMs <= previousMs) {
    return new Date(previousMs + 1).toISOString();
  }
  return new Date(nowMs).toISOString();
}

function createBaseStore() {
  return {
    nextCartItemNumber: 1,
    nextOrderNumber: 2001,
    cartsByOwner: new Map(),
    ordersByPublicId: new Map(),
  };
}

function ensureStore() {
  const existing = globalThis[STORE_KEY];
  if (existing) {
    return existing;
  }

  const store = createBaseStore();
  globalThis[STORE_KEY] = store;
  return store;
}

function nextCartItemId(store) {
  const id = `cart-item-${String(store.nextCartItemNumber).padStart(4, "0")}`;
  store.nextCartItemNumber += 1;
  return id;
}

function nextOrderPublicId(store) {
  const publicId = `ORD-${store.nextOrderNumber}`;
  store.nextOrderNumber += 1;
  return publicId;
}

function ensureCart(ownerKey) {
  const store = ensureStore();
  const existing = store.cartsByOwner.get(ownerKey);
  if (existing) {
    return existing;
  }

  const timestamp = nowIso();
  const created = {
    ownerKey,
    orderType: ORDER_TYPES.DELIVERY,
    items: [],
    deliveryAddress: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  store.cartsByOwner.set(ownerKey, created);
  return created;
}

function touchCart(cart) {
  cart.updatedAt = nextUpdatedAt(cart.updatedAt);
}

function normalizeQuantity(quantity) {
  const parsed = Number.parseInt(String(quantity), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
    throw new CartValidationError("Quantity must be between 1 and 20.", 400, "INVALID_QUANTITY");
  }
  return parsed;
}

function normalizeSelectedOptionIds(selectedOptionIds) {
  if (!Array.isArray(selectedOptionIds)) {
    return [];
  }

  const dedup = [];
  const seen = new Set();
  for (const optionId of selectedOptionIds) {
    const text = String(optionId || "").trim();
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    dedup.push(text);
  }
  return dedup;
}

function normalizeSpecialInstructions(specialInstructions) {
  const normalized = String(specialInstructions || "").trim();
  if (normalized.length > 280) {
    throw new CartValidationError(
      "Special instructions cannot exceed 280 characters.",
      400,
      "INVALID_SPECIAL_INSTRUCTIONS",
    );
  }
  return normalized;
}

function normalizeDeliveryAddress(deliveryAddress) {
  if (!deliveryAddress) {
    return null;
  }

  const line1 = String(deliveryAddress.line1 || "").trim();
  const city = String(deliveryAddress.city || "").trim();
  const postalCode = String(deliveryAddress.postalCode || "").trim();
  const notes = String(deliveryAddress.notes || "").trim();

  if (!line1 || !city) {
    throw new CartValidationError(
      "Delivery address line1 and city are required for delivery orders.",
      400,
      "DELIVERY_ADDRESS_REQUIRED",
    );
  }

  return {
    line1,
    city,
    postalCode,
    notes,
  };
}

function sortIds(ids) {
  return [...ids].sort((left, right) => left.localeCompare(right));
}

async function resolveItemOrThrow(itemId) {
  try {
    return await getPublicItemDetail(itemId);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error.code === "ITEM_NOT_FOUND" || error.code === "CATEGORY_NOT_FOUND")
    ) {
      throw new CartValidationError(
        "Menu item is unavailable. Please refresh your cart.",
        409,
        "ITEM_UNAVAILABLE",
      );
    }
    throw error;
  }
}

function validateModifierSelection(itemDetail, selectedOptionIds, { strict }) {
  const selectedIds = normalizeSelectedOptionIds(selectedOptionIds);
  const optionMap = new Map();
  const groupMap = new Map();

  for (const group of itemDetail.modifierGroups) {
    groupMap.set(group.id, group);
    for (const option of group.options) {
      optionMap.set(option.id, {
        group,
        option,
      });
    }
  }

  const selectedModifiers = [];
  const countByGroupId = new Map();

  for (const optionId of selectedIds) {
    const match = optionMap.get(optionId);
    if (!match) {
      if (strict) {
        throw new CartValidationError(
          "One or more selected modifiers are invalid for this item.",
          400,
          "INVALID_MODIFIER_SELECTION",
        );
      }
      continue;
    }

    const currentCount = countByGroupId.get(match.group.id) || 0;
    countByGroupId.set(match.group.id, currentCount + 1);
    selectedModifiers.push({
      groupId: match.group.id,
      groupName: match.group.name,
      optionId: match.option.id,
      optionName: match.option.name,
      priceDelta: roundMoney(match.option.priceDelta),
    });
  }

  for (const group of itemDetail.modifierGroups) {
    const selectedCount = countByGroupId.get(group.id) || 0;
    const requiredMin = Math.max(group.minSelect, group.isRequired ? 1 : 0);

    if (selectedCount < requiredMin || selectedCount > group.maxSelect) {
      if (strict) {
        throw new CartValidationError(
          `Modifier selection for "${group.name}" must be between ${requiredMin} and ${group.maxSelect}.`,
          400,
          "MODIFIER_RULE_VIOLATION",
        );
      }
    }
  }

  const modifierTotal = roundMoney(
    selectedModifiers.reduce((sum, modifier) => sum + modifier.priceDelta, 0),
  );

  return {
    selectedOptionIds: sortIds(selectedModifiers.map((modifier) => modifier.optionId)),
    selectedModifiers,
    modifierTotal,
  };
}

function toDisplayModifierGroups(itemDetail, selectedOptionIds) {
  const selectedSet = new Set(selectedOptionIds);
  return itemDetail.modifierGroups.map((group) => ({
    id: group.id,
    name: group.name,
    isRequired: group.isRequired,
    minSelect: group.minSelect,
    maxSelect: group.maxSelect,
    options: group.options.map((option) => ({
      id: option.id,
      name: option.name,
      priceDelta: roundMoney(option.priceDelta),
      isActive: option.isActive,
      selected: selectedSet.has(option.id),
    })),
  }));
}

async function buildCartLineView(line, { strict }) {
  try {
    const itemDetail = await resolveItemOrThrow(line.itemId);
    const quantity = normalizeQuantity(line.quantity);
    const selection = validateModifierSelection(itemDetail, line.selectedOptionIds, { strict });

    const basePrice = roundMoney(itemDetail.basePrice);
    const unitPrice = roundMoney(basePrice + selection.modifierTotal);
    const lineTotal = roundMoney(unitPrice * quantity);

    return {
      id: line.id,
      itemId: line.itemId,
      itemName: itemDetail.name,
      quantity,
      specialInstructions: line.specialInstructions || "",
      selectedOptionIds: selection.selectedOptionIds,
      selectedModifiers: selection.selectedModifiers,
      modifierGroups: toDisplayModifierGroups(itemDetail, selection.selectedOptionIds),
      basePrice,
      modifierTotal: selection.modifierTotal,
      unitPrice,
      lineTotal,
      availability: "active",
      validationIssues: [],
    };
  } catch (error) {
    if (strict) {
      throw error;
    }

    const fallbackIssues = [];
    if (error instanceof Error) {
      fallbackIssues.push(error.message);
    }

    let fallbackName = line.itemNameSnapshot || "Unavailable item";
    try {
      const adminItem = await getAdminItemDetail(line.itemId);
      fallbackName = adminItem.name;
    } catch {
      // Keep snapshot name.
    }

    const quantity = Number.isInteger(line.quantity) ? line.quantity : 1;
    const unitPrice = roundMoney(line.unitPriceSnapshot || 0);

    return {
      id: line.id,
      itemId: line.itemId,
      itemName: fallbackName,
      quantity,
      specialInstructions: line.specialInstructions || "",
      selectedOptionIds: normalizeSelectedOptionIds(line.selectedOptionIds),
      selectedModifiers: [],
      modifierGroups: [],
      basePrice: roundMoney(line.basePriceSnapshot || 0),
      modifierTotal: roundMoney(line.modifierTotalSnapshot || 0),
      unitPrice,
      lineTotal: roundMoney(unitPrice * quantity),
      availability: "inactive",
      validationIssues: fallbackIssues.length > 0 ? fallbackIssues : ["Item requires attention."],
    };
  }
}

async function toCartSnapshot(cart) {
  const items = await Promise.all(cart.items.map((line) => buildCartLineView(line, { strict: false })));
  const subtotal = roundMoney(items.reduce((sum, line) => sum + line.lineTotal, 0));
  const itemCount = items.reduce((sum, line) => sum + line.quantity, 0);
  const hasValidationIssues = items.some((line) => line.validationIssues.length > 0);

  return {
    orderType: cart.orderType,
    itemCount,
    subtotal,
    hasValidationIssues,
    items,
    deliveryAddress: cart.deliveryAddress,
    updatedAt: cart.updatedAt,
  };
}

function getMinimumOrderTotal(orderType) {
  return MINIMUM_ORDER_TOTALS[orderType] ?? 0;
}

function computeDiscount(subtotal) {
  if (subtotal >= 60) {
    return 8;
  }
  if (subtotal >= 40) {
    return 4;
  }
  return 0;
}

function computeDeliveryFee(orderType, subtotal) {
  if (orderType !== ORDER_TYPES.DELIVERY) {
    return 0;
  }
  if (subtotal >= DELIVERY_FREE_THRESHOLD) {
    return 0;
  }
  return DELIVERY_BASE_FEE;
}

function buildCheckoutSummary({ orderType, subtotal }) {
  const discount = computeDiscount(subtotal);
  const taxable = Math.max(0, subtotal - discount);
  const tax = TAX_INCLUDED_IN_MENU_PRICES
    ? roundMoney(taxable - taxable / (1 + TAX_RATE))
    : roundMoney(taxable * TAX_RATE);
  const deliveryFee = computeDeliveryFee(orderType, subtotal);
  const taxAppliedToTotal = TAX_INCLUDED_IN_MENU_PRICES ? 0 : tax;
  const total = computeCheckoutTotal({
    subtotal,
    discount,
    tax: taxAppliedToTotal,
    deliveryFee,
  });

  return {
    subtotal: roundMoney(subtotal),
    discount: roundMoney(discount),
    tax,
    deliveryFee: roundMoney(deliveryFee),
    total,
    taxRate: TAX_RATE,
    taxIncludedInMenuPrices: TAX_INCLUDED_IN_MENU_PRICES,
    currency: "USD",
  };
}

async function prepareCheckout(cart, payload, { user }) {
  if (!cart.items.length) {
    throw new CartValidationError("Cart is empty.", 409, "CART_EMPTY");
  }

  const orderType = payload.orderType || cart.orderType;
  const strictLines = await Promise.all(
    cart.items.map((line) => buildCartLineView(line, { strict: true })),
  );
  const subtotal = roundMoney(strictLines.reduce((sum, line) => sum + line.lineTotal, 0));
  const minimumOrderTotal = getMinimumOrderTotal(orderType);

  if (subtotal < minimumOrderTotal) {
    throw new CartValidationError(
      `Minimum order total for ${orderType.replace("_", " ").toLowerCase()} is $${minimumOrderTotal.toFixed(2)}.`,
      409,
      "MINIMUM_ORDER_NOT_MET",
    );
  }

  let deliveryAddress = payload.deliveryAddress || cart.deliveryAddress;
  if (orderType === ORDER_TYPES.DELIVERY) {
    if (!deliveryAddress && user?.addressLine1 && user?.addressCity) {
      deliveryAddress = {
        line1: user.addressLine1,
        city: user.addressCity,
        postalCode: "",
        notes: "",
      };
    }

    deliveryAddress = normalizeDeliveryAddress(deliveryAddress);
  } else {
    deliveryAddress = null;
  }

  const summary = buildCheckoutSummary({ orderType, subtotal });

  return {
    orderType,
    paymentMethod: payload.paymentMethod,
    minimumOrderTotal,
    deliveryAddress,
    items: strictLines,
    summary,
  };
}

function refreshLineSnapshots(line, lineView) {
  line.itemNameSnapshot = lineView.itemName;
  line.basePriceSnapshot = lineView.basePrice;
  line.modifierTotalSnapshot = lineView.modifierTotal;
  line.unitPriceSnapshot = lineView.unitPrice;
}

export function resetCartStoreForTests() {
  const freshStore = createBaseStore();
  globalThis[STORE_KEY] = freshStore;
  return freshStore;
}

/**
 * @param {string} ownerKey
 */
export async function getCartSnapshot(ownerKey) {
  const cart = ensureCart(ownerKey);
  return await toCartSnapshot(cart);
}

/**
 * @param {string} ownerKey
 * @param {{ orderType?: string }} patch
 */
export async function updateCart(ownerKey, patch) {
  const cart = ensureCart(ownerKey);

  if (patch.orderType) {
    cart.orderType = patch.orderType;
    touchCart(cart);
  }

  return await toCartSnapshot(cart);
}

/**
 * @param {string} ownerKey
 * @param {{ itemId: string; quantity: number; selectedOptionIds: string[]; specialInstructions: string }} payload
 */
export async function addCartItem(ownerKey, payload) {
  const store = ensureStore();
  const cart = ensureCart(ownerKey);
  const itemDetail = await resolveItemOrThrow(payload.itemId);

  const quantity = normalizeQuantity(payload.quantity);
  const specialInstructions = normalizeSpecialInstructions(payload.specialInstructions);
  const selection = validateModifierSelection(itemDetail, payload.selectedOptionIds, { strict: true });

  const existing = cart.items.find((line) => {
    return (
      line.itemId === payload.itemId &&
      line.specialInstructions === specialInstructions &&
      JSON.stringify(normalizeSelectedOptionIds(line.selectedOptionIds)) ===
        JSON.stringify(selection.selectedOptionIds)
    );
  });

  if (existing) {
    const mergedQuantity = normalizeQuantity(existing.quantity + quantity);
    existing.quantity = mergedQuantity;
    existing.selectedOptionIds = selection.selectedOptionIds;
    existing.specialInstructions = specialInstructions;
    existing.updatedAt = nextUpdatedAt(existing.updatedAt);
    const lineView = await buildCartLineView(existing, { strict: true });
    refreshLineSnapshots(existing, lineView);
    touchCart(cart);
    return await toCartSnapshot(cart);
  }

  const line = {
    id: nextCartItemId(store),
    itemId: payload.itemId,
    quantity,
    selectedOptionIds: selection.selectedOptionIds,
    specialInstructions,
    itemNameSnapshot: itemDetail.name,
    basePriceSnapshot: roundMoney(itemDetail.basePrice),
    modifierTotalSnapshot: selection.modifierTotal,
    unitPriceSnapshot: roundMoney(itemDetail.basePrice + selection.modifierTotal),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  cart.items.push(line);
  touchCart(cart);
  return await toCartSnapshot(cart);
}

/**
 * @param {string} ownerKey
 * @param {string} cartItemId
 * @param {{ quantity?: number; selectedOptionIds?: string[]; specialInstructions?: string }} patch
 */
export async function updateCartItem(ownerKey, cartItemId, patch) {
  const cart = ensureCart(ownerKey);
  const line = cart.items.find((entry) => entry.id === cartItemId);
  if (!line) {
    throw new CartValidationError("Cart item not found.", 404, "CART_ITEM_NOT_FOUND");
  }

  const nextQuantity = patch.quantity === undefined ? line.quantity : normalizeQuantity(patch.quantity);
  const nextSpecialInstructions =
    patch.specialInstructions === undefined
      ? line.specialInstructions
      : normalizeSpecialInstructions(patch.specialInstructions);
  const nextSelectedOptionIds =
    patch.selectedOptionIds === undefined
      ? normalizeSelectedOptionIds(line.selectedOptionIds)
      : normalizeSelectedOptionIds(patch.selectedOptionIds);

  const itemDetail = await resolveItemOrThrow(line.itemId);
  const selection = validateModifierSelection(itemDetail, nextSelectedOptionIds, { strict: true });

  line.quantity = nextQuantity;
  line.specialInstructions = nextSpecialInstructions;
  line.selectedOptionIds = selection.selectedOptionIds;
  line.updatedAt = nextUpdatedAt(line.updatedAt);

  const lineView = await buildCartLineView(line, { strict: true });
  refreshLineSnapshots(line, lineView);
  touchCart(cart);

  return await toCartSnapshot(cart);
}

/**
 * @param {string} ownerKey
 * @param {string} cartItemId
 */
export async function removeCartItem(ownerKey, cartItemId) {
  const cart = ensureCart(ownerKey);
  const index = cart.items.findIndex((entry) => entry.id === cartItemId);
  if (index < 0) {
    throw new CartValidationError("Cart item not found.", 404, "CART_ITEM_NOT_FOUND");
  }

  cart.items.splice(index, 1);
  touchCart(cart);
  return await toCartSnapshot(cart);
}

/**
 * @param {string} ownerKey
 * @param {{ orderType?: string; paymentMethod: string; deliveryAddress?: { line1?: string; city?: string; postalCode?: string; notes?: string } }} payload
 * @param {{ user?: { addressLine1?: string | null; addressCity?: string | null } }} [options]
 */
export async function previewCheckout(ownerKey, payload, options = {}) {
  const cart = ensureCart(ownerKey);
  const prepared = await prepareCheckout(cart, payload, { user: options.user });

  if (prepared.deliveryAddress) {
    cart.deliveryAddress = prepared.deliveryAddress;
    touchCart(cart);
  }
  if (prepared.orderType !== cart.orderType) {
    cart.orderType = prepared.orderType;
    touchCart(cart);
  }

  return {
    checkout: prepared,
  };
}

/**
 * @param {string} ownerKey
 * @param {{ orderType?: string; paymentMethod: string; deliveryAddress?: { line1?: string; city?: string; postalCode?: string; notes?: string } }} payload
 * @param {{ id: string; email: string; addressLine1?: string | null; addressCity?: string | null }} user
 */
export async function placeCheckout(ownerKey, payload, user) {
  const store = ensureStore();
  const cart = ensureCart(ownerKey);
  const prepared = await prepareCheckout(cart, payload, { user });

  const publicId = nextOrderPublicId(store);
  const timestamp = nowIso();

  const order = {
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

  store.ordersByPublicId.set(publicId, order);

  cart.items = [];
  cart.orderType = ORDER_TYPES.DELIVERY;
  cart.deliveryAddress = null;
  touchCart(cart);

  return {
    order,
  };
}

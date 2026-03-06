export class CartValidationError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number = 400, code: string = "CART_VALIDATION_ERROR") {
    super(message);
    this.name = "CartValidationError";
    this.status = status;
    this.code = code;
  }
}

export const ORDER_TYPES = {
  DINE_IN: "DINE_IN",
  DELIVERY: "DELIVERY",
  PICKUP: "PICKUP",
} as const;

export type OrderType = (typeof ORDER_TYPES)[keyof typeof ORDER_TYPES];

export const PAYMENT_METHODS = {
  CARD: "CARD",
  GOOGLE_PAY: "GOOGLE_PAY",
  APPLE_PAY: "APPLE_PAY",
  PAYPAL: "PAYPAL",
  CASH: "CASH",
} as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

const ORDER_TYPE_VALUES = new Set<string>(Object.values(ORDER_TYPES));
const PAYMENT_METHOD_VALUES = new Set<string>(Object.values(PAYMENT_METHODS));
const MAX_SPECIAL_INSTRUCTIONS = 280;

function requiredString(value: unknown, fieldName: string): string {
  const text = String(value || "").trim();
  if (!text) {
    throw new CartValidationError(`${fieldName} is required.`, 400, "INVALID_INPUT");
  }
  return text;
}

function optionalString(value: unknown, maxLength?: number): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const text = String(value).trim();
  if (maxLength && text.length > maxLength) {
    throw new CartValidationError(`Text exceeds max length of ${maxLength}.`, 400, "INVALID_INPUT");
  }
  return text;
}

function parseQuantity(
  value: unknown,
  { allowUndefined = false, defaultValue = 1 }: { allowUndefined?: boolean; defaultValue?: number } = {},
): number | undefined {
  if (value === undefined || value === null || value === "") {
    if (allowUndefined) {
      return undefined;
    }
    return defaultValue;
  }

  const quantity = Number.parseInt(String(value), 10);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    throw new CartValidationError("Quantity must be between 1 and 20.", 400, "INVALID_QUANTITY");
  }
  return quantity;
}

function parseOrderType(
  value: unknown,
  { allowUndefined = false, defaultValue = ORDER_TYPES.DELIVERY }: { allowUndefined?: boolean; defaultValue?: string } = {},
): string | undefined {
  if (value === undefined || value === null || value === "") {
    if (allowUndefined) {
      return undefined;
    }
    return defaultValue;
  }

  const parsed = String(value).trim().toUpperCase();
  if (!ORDER_TYPE_VALUES.has(parsed)) {
    throw new CartValidationError("Order type is invalid.", 400, "INVALID_ORDER_TYPE");
  }
  return parsed;
}

function parsePaymentMethod(
  value: unknown,
  { allowUndefined = false, defaultValue = PAYMENT_METHODS.CARD }: { allowUndefined?: boolean; defaultValue?: string } = {},
): string | undefined {
  if (value === undefined || value === null || value === "") {
    if (allowUndefined) {
      return undefined;
    }
    return defaultValue;
  }

  const parsed = String(value).trim().toUpperCase();
  if (!PAYMENT_METHOD_VALUES.has(parsed)) {
    throw new CartValidationError("Payment method is invalid.", 400, "INVALID_PAYMENT_METHOD");
  }
  return parsed;
}

function parseSpecialInstructions(
  value: unknown,
  { allowUndefined = false }: { allowUndefined?: boolean } = {},
): string | undefined {
  if (value === undefined || value === null) {
    if (allowUndefined) {
      return undefined;
    }
    return "";
  }

  const parsed = String(value).trim();
  if (parsed.length > MAX_SPECIAL_INSTRUCTIONS) {
    throw new CartValidationError(
      `Special instructions cannot exceed ${MAX_SPECIAL_INSTRUCTIONS} characters.`,
      400,
      "INVALID_SPECIAL_INSTRUCTIONS",
    );
  }
  return parsed;
}

function parseSelectedOptionIds(
  value: unknown,
  { allowUndefined = false }: { allowUndefined?: boolean } = {},
): string[] | undefined {
  if (value === undefined || value === null) {
    if (allowUndefined) {
      return undefined;
    }
    return [];
  }

  if (!Array.isArray(value)) {
    throw new CartValidationError(
      "selectedOptionIds must be an array of modifier option ids.",
      400,
      "INVALID_INPUT",
    );
  }

  const dedup: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const optionId = requiredString(entry, "Modifier option id");
    if (seen.has(optionId)) {
      continue;
    }
    seen.add(optionId);
    dedup.push(optionId);
  }

  if (dedup.length > 24) {
    throw new CartValidationError("Too many modifier options selected.", 400, "INVALID_INPUT");
  }

  return dedup;
}

export interface DeliveryAddress {
  line1: string;
  city: string;
  postalCode: string;
  notes: string;
}

function parseDeliveryAddress(
  value: unknown,
  { allowUndefined = false }: { allowUndefined?: boolean } = {},
): DeliveryAddress | undefined {
  if (value === undefined || value === null) {
    if (allowUndefined) {
      return undefined;
    }
    throw new CartValidationError("Delivery address is required.", 400, "DELIVERY_ADDRESS_REQUIRED");
  }

  if (typeof value !== "object") {
    throw new CartValidationError("Delivery address is invalid.", 400, "INVALID_INPUT");
  }

  const addr = value as Record<string, unknown>;
  const line1 = optionalString(addr.line1, 255);
  const city = optionalString(addr.city, 120);
  const postalCode = optionalString(addr.postalCode, 32) || "";
  const notes = optionalString(addr.notes, MAX_SPECIAL_INSTRUCTIONS) || "";

  const hasAnyField = Boolean(line1 || city || postalCode || notes);
  if (!hasAnyField && allowUndefined) {
    return undefined;
  }

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

export function validateCartItemCreate(payload: Record<string, unknown>): {
  itemId: string;
  quantity: number;
  selectedOptionIds: string[];
  specialInstructions: string;
} {
  return {
    itemId: requiredString(payload.itemId, "Item id"),
    quantity: parseQuantity(payload.quantity) as number,
    selectedOptionIds: parseSelectedOptionIds(payload.selectedOptionIds) as string[],
    specialInstructions: parseSpecialInstructions(payload.specialInstructions) as string,
  };
}

export function validateCartItemUpdate(payload: Record<string, unknown>): {
  quantity?: number;
  selectedOptionIds?: string[];
  specialInstructions?: string;
} {
  const next = {
    quantity: parseQuantity(payload.quantity, { allowUndefined: true }),
    selectedOptionIds: parseSelectedOptionIds(payload.selectedOptionIds, { allowUndefined: true }),
    specialInstructions: parseSpecialInstructions(payload.specialInstructions, { allowUndefined: true }),
  };

  const hasAnyField = Object.values(next).some((value) => value !== undefined);
  if (!hasAnyField) {
    throw new CartValidationError("No cart item fields provided for update.", 400, "INVALID_INPUT");
  }

  return next;
}

export function validateCartPatch(payload: Record<string, unknown>): {
  orderType: string;
} {
  const next = {
    orderType: parseOrderType(payload.orderType, { allowUndefined: true }),
  };

  if (!next.orderType) {
    throw new CartValidationError("No cart fields provided for update.", 400, "INVALID_INPUT");
  }

  return next as { orderType: string };
}

export function validateCheckoutRequest(payload: Record<string, unknown>): {
  orderType?: string;
  paymentMethod: string;
  deliveryAddress?: DeliveryAddress;
} {
  return {
    orderType: parseOrderType(payload.orderType, { allowUndefined: true }),
    paymentMethod: parsePaymentMethod(payload.paymentMethod) as string,
    deliveryAddress: parseDeliveryAddress(payload.deliveryAddress, { allowUndefined: true }),
  };
}

export function validateDeliveryAddress(value: unknown): DeliveryAddress {
  return parseDeliveryAddress(value, { allowUndefined: false }) as DeliveryAddress;
}

import {
  addCartItem,
  placeCheckout,
  previewCheckout,
  removeCartItem,
  updateCart,
  updateCartItem,
} from "./commands.ts";
import {
  TAX_INCLUDED_IN_MENU_PRICES,
  TAX_RATE,
  getCartSnapshot,
} from "./queries.ts";
import { ORDER_TYPES } from "./validation.ts";

export async function getCartUseCase(ownerKey: string) {
  return getCartSnapshot(ownerKey);
}

export async function updateCartUseCase(ownerKey: string, patch: { orderType?: string }) {
  return updateCart(ownerKey, patch);
}

export async function addCartItemUseCase(
  ownerKey: string,
  payload: { itemId: string; quantity: number; selectedOptionIds: string[]; specialInstructions: string },
) {
  return addCartItem(ownerKey, payload);
}

export async function updateCartItemUseCase(
  ownerKey: string,
  cartItemId: string,
  patch: { quantity?: number; selectedOptionIds?: string[]; specialInstructions?: string },
) {
  return updateCartItem(ownerKey, cartItemId, patch);
}

export async function removeCartItemUseCase(ownerKey: string, cartItemId: string) {
  return removeCartItem(ownerKey, cartItemId);
}

export async function previewCheckoutUseCase(
  ownerKey: string,
  payload: {
    orderType?: string;
    paymentMethod: string;
    deliveryAddress?: { line1?: string; city?: string; postalCode?: string; notes?: string };
  },
  user: { addressLine1?: string | null; addressCity?: string | null } | null,
) {
  return previewCheckout(ownerKey, payload, { user });
}

export async function placeCheckoutUseCase(
  ownerKey: string,
  payload: {
    orderType?: string;
    paymentMethod: string;
    deliveryAddress?: { line1?: string; city?: string; postalCode?: string; notes?: string };
  },
  user: { id: string; email: string; addressLine1?: string | null; addressCity?: string | null },
) {
  return placeCheckout(ownerKey, payload, user);
}

export function buildCartResponseUseCase(cart: Awaited<ReturnType<typeof getCartSnapshot>>) {
  return {
    cart,
    config: {
      orderTypes: Object.values(ORDER_TYPES),
      taxIncludedInMenuPrices: TAX_INCLUDED_IN_MENU_PRICES,
      taxRate: TAX_RATE,
      currency: "USD",
    },
  };
}

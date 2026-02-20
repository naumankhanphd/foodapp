import { NextRequest, NextResponse } from "next/server";
import { parseJsonRequest, toErrorResponse } from "@/lib/auth/http.mjs";
import { applyCartGuestCookie, resolveCartOwner } from "@/lib/cart/session.mjs";
import {
  TAX_INCLUDED_IN_MENU_PRICES,
  TAX_RATE,
  getCartSnapshot,
  updateCart,
} from "@/lib/cart/store.mjs";
import { ORDER_TYPES, validateCartPatch } from "@/lib/cart/validation.mjs";

function cartResponse(cart: Awaited<ReturnType<typeof getCartSnapshot>>) {
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

export async function GET(request: NextRequest) {
  try {
    const owner = resolveCartOwner(request);
    const cart = await getCartSnapshot(owner.ownerKey);
    const response = NextResponse.json(cartResponse(cart));
    return applyCartGuestCookie(response, owner);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const owner = resolveCartOwner(request);
    const body = await parseJsonRequest(request);
    const patch = validateCartPatch(body);
    const cart = await updateCart(owner.ownerKey, patch);
    const response = NextResponse.json(cartResponse(cart));
    return applyCartGuestCookie(response, owner);
  } catch (error) {
    return toErrorResponse(error);
  }
}

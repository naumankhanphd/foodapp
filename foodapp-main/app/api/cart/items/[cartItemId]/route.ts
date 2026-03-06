import { NextRequest, NextResponse } from "next/server";
import { parseJsonRequest, toErrorResponse } from "@/lib/auth/http.ts";
import { applyCartGuestCookie, resolveCartOwner } from "@/lib/cart/session.ts";
import { removeCartItem, updateCartItem } from "@/lib/cart/store.ts";
import { validateCartItemUpdate } from "@/lib/cart/validation.ts";

type CartItemRouteProps = {
  params: Promise<{ cartItemId: string }>;
};

export async function PATCH(request: NextRequest, { params }: CartItemRouteProps) {
  try {
    const owner = resolveCartOwner(request);
    const { cartItemId } = await params;
    const body = await parseJsonRequest(request);
    const patch = validateCartItemUpdate(body);

    const cart = await updateCartItem(owner.ownerKey, cartItemId, patch);
    const response = NextResponse.json({ cart });
    return applyCartGuestCookie(response, owner, request);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: CartItemRouteProps) {
  try {
    const owner = resolveCartOwner(request);
    const { cartItemId } = await params;

    const cart = await removeCartItem(owner.ownerKey, cartItemId);
    const response = NextResponse.json({ cart });
    return applyCartGuestCookie(response, owner, request);
  } catch (error) {
    return toErrorResponse(error);
  }
}

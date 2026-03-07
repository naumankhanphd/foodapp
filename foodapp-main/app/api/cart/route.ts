import { NextRequest, NextResponse } from "next/server";
import { parseJsonRequest, toErrorResponse } from "@/lib/auth/http.ts";
import { applyCartGuestCookie, resolveCartOwner } from "@/lib/cart/session.ts";
import {
  buildCartResponseUseCase,
  getCartUseCase,
  updateCartUseCase,
} from "@/lib/cart/use-cases.ts";
import { validateCartPatch } from "@/lib/cart/validation.ts";

export async function GET(request: NextRequest) {
  try {
    const owner = resolveCartOwner(request);
    const cart = await getCartUseCase(owner.ownerKey);
    const response = NextResponse.json(buildCartResponseUseCase(cart));
    return applyCartGuestCookie(response, owner, request);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const owner = resolveCartOwner(request);
    const body = await parseJsonRequest(request);
    const patch = validateCartPatch(body);
    const cart = await updateCartUseCase(owner.ownerKey, patch);
    const response = NextResponse.json(buildCartResponseUseCase(cart));
    return applyCartGuestCookie(response, owner, request);
  } catch (error) {
    return toErrorResponse(error);
  }
}

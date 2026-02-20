import { NextRequest, NextResponse } from "next/server";
import { parseJsonRequest, toErrorResponse } from "@/lib/auth/http.mjs";
import { applyCartGuestCookie, resolveCartOwner } from "@/lib/cart/session.mjs";
import { addCartItem } from "@/lib/cart/store.mjs";
import { validateCartItemCreate } from "@/lib/cart/validation.mjs";

export async function POST(request: NextRequest) {
  try {
    const owner = resolveCartOwner(request);
    const body = await parseJsonRequest(request);
    const payload = validateCartItemCreate(body) as {
      itemId: string;
      quantity: number;
      selectedOptionIds: string[];
      specialInstructions: string;
    };

    const cart = await addCartItem(owner.ownerKey, payload);
    const response = NextResponse.json({ cart }, { status: 201 });
    return applyCartGuestCookie(response, owner);
  } catch (error) {
    return toErrorResponse(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { parseJsonRequest, toErrorResponse } from "@/lib/auth/http.ts";
import { applyCartGuestCookie, resolveCartOwner } from "@/lib/cart/session.ts";
import { addCartItemUseCase } from "@/lib/cart/use-cases.ts";
import { validateCartItemCreate } from "@/lib/cart/validation.ts";

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

    const cart = await addCartItemUseCase(owner.ownerKey, payload);
    const response = NextResponse.json({ cart }, { status: 201 });
    return applyCartGuestCookie(response, owner, request);
  } catch (error) {
    return toErrorResponse(error);
  }
}

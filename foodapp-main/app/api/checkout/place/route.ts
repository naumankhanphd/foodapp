import { NextResponse } from "next/server";
import { ROLES } from "@/lib/auth/config.mjs";
import { getSessionOrThrow, parseJsonRequest, toErrorResponse } from "@/lib/auth/http.mjs";
import { placeCheckout } from "@/lib/cart/store.mjs";
import { validateCheckoutRequest } from "@/lib/cart/validation.mjs";

export async function POST(request: Request) {
  try {
    const session = getSessionOrThrow(request, {
      roles: [ROLES.CUSTOMER],
      requirePhoneVerified: true,
    });

    const body = await parseJsonRequest(request);
    const payload = validateCheckoutRequest(body) as {
      orderType?: string;
      paymentMethod: string;
      deliveryAddress?: {
        line1?: string;
        city?: string;
        postalCode?: string;
        notes?: string;
      };
    };

    const result = await placeCheckout(`user:${session.user.id}`, payload, session.user);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

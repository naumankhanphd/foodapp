import { NextResponse } from "next/server";
import { ROLES } from "@/lib/auth/config.ts";
import { getSessionOrThrow, parseJsonRequest, toErrorResponse } from "@/lib/auth/http.ts";
import { previewCheckoutUseCase } from "@/lib/cart/use-cases.ts";
import { validateCheckoutRequest } from "@/lib/cart/validation.ts";

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

    const result = await previewCheckoutUseCase(`user:${session.user.id}`, payload, session.user);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

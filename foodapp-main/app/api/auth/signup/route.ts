import { NextResponse } from "next/server";
import {
  createSessionTokenForUser,
  getMissingMandatoryProfileFields,
  registerWithPassword,
} from "@/lib/auth/service.mjs";
import { parseJsonRequest, toErrorResponse, withSessionCookie } from "@/lib/auth/http.mjs";

export async function POST(request: Request) {
  try {
    const body = await parseJsonRequest(request);
    const user = await registerWithPassword(body);
    const sessionToken = createSessionTokenForUser(user);
    const missingFields = user.role === "CUSTOMER" ? getMissingMandatoryProfileFields(user) : [];
    const requiresCompletion = missingFields.length > 0;

    const response = NextResponse.json({
      user,
      requiresCompletion,
      missingFields,
      policy: {
        guestCanBrowse: true,
        checkoutRequiresLogin: true,
      },
    });

    return withSessionCookie(response, sessionToken);
  } catch (error) {
    return toErrorResponse(error);
  }
}

import { NextResponse } from "next/server";
import {
  completeCustomerProfile,
  completeGoogleProfile,
  createSessionTokenForUser,
  sendPhoneCode,
} from "@/lib/auth/service.mjs";
import {
  getSessionOrThrow,
  parseJsonRequest,
  toErrorResponse,
  withSessionCookie,
} from "@/lib/auth/http.mjs";

export async function POST(request: Request) {
  try {
    const body = await parseJsonRequest(request);
    const pendingToken = String(body.pendingToken || "").trim();
    const user = pendingToken
      ? await completeGoogleProfile(body)
      : await completeCustomerProfile({
          ...body,
          userId: getSessionOrThrow(request).user.id,
        });

    const requiresPhoneVerification = !user.phoneVerified;
    let devPhoneCode;
    if (requiresPhoneVerification) {
      const phoneCode = await sendPhoneCode({ userId: user.id });
      devPhoneCode = phoneCode.devCode;
    }

    const sessionToken = createSessionTokenForUser(user);
    const response = NextResponse.json({
      user,
      requiresPhoneVerification,
      devPhoneCode,
    });

    return withSessionCookie(response, sessionToken);
  } catch (error) {
    return toErrorResponse(error);
  }
}

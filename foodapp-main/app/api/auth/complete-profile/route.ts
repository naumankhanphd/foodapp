import { NextResponse } from "next/server";
import {
  completeGoogleProfile,
  createSessionTokenForUser,
  sendPhoneCode,
} from "@/lib/auth/service.mjs";
import { parseJsonRequest, toErrorResponse, withSessionCookie } from "@/lib/auth/http.mjs";

export async function POST(request: Request) {
  try {
    const body = await parseJsonRequest(request);
    const user = await completeGoogleProfile(body);
    const phoneCode = await sendPhoneCode({ userId: user.id });

    const sessionToken = createSessionTokenForUser(user);
    const response = NextResponse.json({
      user,
      requiresPhoneVerification: true,
      devPhoneCode: phoneCode.devCode,
    });

    return withSessionCookie(response, sessionToken);
  } catch (error) {
    return toErrorResponse(error);
  }
}

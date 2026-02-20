import { NextResponse } from "next/server";
import { createSessionTokenForUser, verifyPhoneCode } from "@/lib/auth/service.mjs";
import { getSessionOrThrow, parseJsonRequest, toErrorResponse, withSessionCookie } from "@/lib/auth/http.mjs";

export async function POST(request: Request) {
  try {
    const session = getSessionOrThrow(request);
    const body = await parseJsonRequest(request);
    const user = await verifyPhoneCode({
      userId: session.user.id,
      code: body.code,
    });

    const sessionToken = createSessionTokenForUser(user);
    const response = NextResponse.json({ success: true, user });
    return withSessionCookie(response, sessionToken);
  } catch (error) {
    return toErrorResponse(error);
  }
}

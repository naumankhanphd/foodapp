import { NextResponse } from "next/server";
import { verifyPhoneCodeUseCase } from "@/lib/auth/use-cases.ts";
import { getSessionOrThrow, parseJsonRequest, toErrorResponse, withSessionCookie } from "@/lib/auth/http.ts";

export async function POST(request: Request) {
  try {
    const session = getSessionOrThrow(request);
    const body = await parseJsonRequest(request);
    const result = await verifyPhoneCodeUseCase({
      userId: session.user.id,
      code: body.code,
    });

    const response = NextResponse.json({ success: result.success, user: result.user });
    return withSessionCookie(response, result.sessionToken);
  } catch (error) {
    return toErrorResponse(error);
  }
}

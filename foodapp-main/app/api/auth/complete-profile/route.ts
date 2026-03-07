import { NextResponse } from "next/server";
import { completeProfileUseCase } from "@/lib/auth/use-cases.ts";
import {
  getSessionOrThrow,
  parseJsonRequest,
  toErrorResponse,
  withSessionCookie,
} from "@/lib/auth/http.ts";

export async function POST(request: Request) {
  try {
    const body = await parseJsonRequest(request);
    const pendingToken = String(body.pendingToken || "").trim();
    const userId = pendingToken ? undefined : getSessionOrThrow(request).user.id;
    const { user, requiresPhoneVerification, devPhoneCode, sessionToken } = await completeProfileUseCase({
      body,
      userId,
    });
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

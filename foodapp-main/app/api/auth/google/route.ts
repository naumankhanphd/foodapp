import { NextResponse } from "next/server";
import { beginGoogleAuthUseCase } from "@/lib/auth/use-cases.ts";
import { parseJsonRequest, toErrorResponse, withSessionCookie } from "@/lib/auth/http.ts";

export async function POST(request: Request) {
  try {
    const body = await parseJsonRequest(request);
    const result = await beginGoogleAuthUseCase(body);

    if (result.requiresCompletion) {
      return NextResponse.json(result, { status: 202 });
    }

    const response = NextResponse.json({ user: result.user, requiresCompletion: false });
    const sessionToken = result.sessionToken;
    return withSessionCookie(response, sessionToken);
  } catch (error) {
    return toErrorResponse(error);
  }
}

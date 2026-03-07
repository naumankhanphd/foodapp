import { NextResponse } from "next/server";
import { loginWithPasswordUseCase } from "@/lib/auth/use-cases.ts";
import { parseJsonRequest, toErrorResponse, withSessionCookie } from "@/lib/auth/http.ts";

export async function POST(request: Request) {
  try {
    const body = await parseJsonRequest(request);
    const { user, sessionToken, requiresCompletion, missingFields } = await loginWithPasswordUseCase(body);

    const response = NextResponse.json({ user, requiresCompletion, missingFields });
    return withSessionCookie(response, sessionToken);
  } catch (error) {
    return toErrorResponse(error);
  }
}

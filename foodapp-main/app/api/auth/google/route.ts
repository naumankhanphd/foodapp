import { NextResponse } from "next/server";
import { beginGoogleAuth, createSessionTokenForUser } from "@/lib/auth/service.mjs";
import { parseJsonRequest, toErrorResponse, withSessionCookie } from "@/lib/auth/http.mjs";

export async function POST(request: Request) {
  try {
    const body = await parseJsonRequest(request);
    const result = await beginGoogleAuth(body);

    if (result.requiresCompletion) {
      return NextResponse.json(
        {
          requiresCompletion: true,
          pendingToken: result.pendingToken,
          missingFields: result.missingFields,
        },
        { status: 202 },
      );
    }

    const user = result.user;
    if (!user) {
      throw new Error("Google auth user payload is missing.");
    }

    const sessionToken = createSessionTokenForUser(user);
    const response = NextResponse.json({ user, requiresCompletion: false });
    return withSessionCookie(response, sessionToken);
  } catch (error) {
    return toErrorResponse(error);
  }
}

import { NextResponse } from "next/server";
import { AuthError } from "./errors.ts";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "./config.ts";
import { readSessionFromRequest } from "./service.ts";

export async function parseJsonRequest(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function withSessionCookie(response: NextResponse, sessionToken: string): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions());
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}

export function getSessionOrThrow(
  request: Request,
  options: { roles?: string[]; requirePhoneVerified?: boolean } = {},
) {
  const session = readSessionFromRequest(request as unknown as { cookies?: { get?: (name: string) => { value?: string } | undefined } });
  if (!session) {
    throw new AuthError("Authentication required.", 401, "AUTH_REQUIRED");
  }

  if (Array.isArray(options.roles) && options.roles.length > 0) {
    const allowed = options.roles.includes(session.user.role);
    if (!allowed) {
      throw new AuthError("You do not have access to this resource.", 403, "ROLE_FORBIDDEN");
    }
  }

  if (options.requirePhoneVerified && !session.user.phoneVerified) {
    throw new AuthError("Phone verification is required.", 403, "PHONE_VERIFICATION_REQUIRED");
  }

  return session;
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json(
      {
        message: error.message,
        code: error.code,
      },
      { status: error.status },
    );
  }

  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    "message" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    const typedError = error as { status: number; message: string; code?: string };
    const code = typeof typedError.code === "string" ? typedError.code : "REQUEST_ERROR";
    return NextResponse.json(
      {
        message: typedError.message,
        code,
      },
      { status: typedError.status },
    );
  }

  return NextResponse.json(
    {
      message: "Unexpected server error.",
      code: "INTERNAL_ERROR",
    },
    { status: 500 },
  );
}

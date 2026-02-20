import { NextResponse } from "next/server";
import { AuthError } from "./errors.mjs";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "./config.mjs";
import { readSessionFromRequest } from "./service.mjs";

export async function parseJsonRequest(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function withSessionCookie(response, sessionToken) {
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions());
  return response;
}

export function clearSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}

export function getSessionOrThrow(request, options = {}) {
  const session = readSessionFromRequest(request);
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

export function toErrorResponse(error) {
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
    typeof error.status === "number"
  ) {
    const code =
      "code" in error && typeof error.code === "string" ? error.code : "REQUEST_ERROR";
    return NextResponse.json(
      {
        message: error.message,
        code,
      },
      { status: error.status },
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

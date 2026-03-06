import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { readSessionFromRequest } from "../auth/service.ts";

export const CART_GUEST_COOKIE_NAME = "foodapp_guest_cart";

const GUEST_TOKEN_PATTERN = /^[a-zA-Z0-9_-]{10,120}$/;

function parseBooleanEnv(value: string | undefined): boolean | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return undefined;
}

function isHttpsRequest(request: NextRequest | null | undefined): boolean {
  if (!request) {
    return process.env.NODE_ENV === "production";
  }

  const forwardedProto = request.headers?.get?.("x-forwarded-proto");
  if (typeof forwardedProto === "string" && forwardedProto.trim()) {
    return forwardedProto.split(",")[0].trim().toLowerCase() === "https";
  }

  const directProtocol = request.nextUrl?.protocol;
  if (typeof directProtocol === "string" && directProtocol.trim()) {
    return directProtocol.trim().toLowerCase() === "https:";
  }

  const rawUrl = request.url;
  if (typeof rawUrl === "string" && rawUrl.trim()) {
    try {
      return new URL(rawUrl).protocol === "https:";
    } catch {
      return false;
    }
  }

  return false;
}

export function cartGuestCookieOptions(request: NextRequest | null | undefined): {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  const secureOverride = parseBooleanEnv(
    process.env.CART_COOKIE_SECURE ?? process.env.SESSION_COOKIE_SECURE,
  );
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: secureOverride ?? isHttpsRequest(request),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

function normalizeGuestToken(value: unknown): string | null {
  const raw = String(value || "").trim();
  if (!raw || !GUEST_TOKEN_PATTERN.test(raw)) {
    return null;
  }
  return raw;
}

export interface CartOwnerContext {
  ownerKey: string;
  session: ReturnType<typeof readSessionFromRequest>;
  shouldSetGuestCookie: boolean;
  guestToken: string | null;
}

export function resolveCartOwner(request: NextRequest): CartOwnerContext {
  const session = readSessionFromRequest(request);
  if (session?.user?.id) {
    return {
      ownerKey: `user:${session.user.id}`,
      session,
      shouldSetGuestCookie: false,
      guestToken: null,
    };
  }

  const existingToken = normalizeGuestToken(request.cookies?.get?.(CART_GUEST_COOKIE_NAME)?.value);
  if (existingToken) {
    return {
      ownerKey: `guest:${existingToken}`,
      session: null,
      shouldSetGuestCookie: false,
      guestToken: existingToken,
    };
  }

  const guestToken = randomUUID().replace(/-/g, "");
  return {
    ownerKey: `guest:${guestToken}`,
    session: null,
    shouldSetGuestCookie: true,
    guestToken,
  };
}

export function applyCartGuestCookie(
  response: { cookies: { set: (name: string, value: string, options: ReturnType<typeof cartGuestCookieOptions>) => void } },
  ownerContext: CartOwnerContext | null | undefined,
  request: NextRequest,
): typeof response {
  if (ownerContext?.shouldSetGuestCookie && ownerContext?.guestToken) {
    response.cookies.set(
      CART_GUEST_COOKIE_NAME,
      ownerContext.guestToken,
      cartGuestCookieOptions(request),
    );
  }
  return response;
}

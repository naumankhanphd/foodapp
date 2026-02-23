import { randomUUID } from "node:crypto";
import { readSessionFromRequest } from "../auth/service.mjs";

export const CART_GUEST_COOKIE_NAME = "foodapp_guest_cart";

const GUEST_TOKEN_PATTERN = /^[a-zA-Z0-9_-]{10,120}$/;

export function cartGuestCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

function normalizeGuestToken(value) {
  const raw = String(value || "").trim();
  if (!raw || !GUEST_TOKEN_PATTERN.test(raw)) {
    return null;
  }
  return raw;
}

export function resolveCartOwner(request) {
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

export function applyCartGuestCookie(response, ownerContext) {
  if (ownerContext?.shouldSetGuestCookie && ownerContext?.guestToken) {
    response.cookies.set(CART_GUEST_COOKIE_NAME, ownerContext.guestToken, cartGuestCookieOptions());
  }
  return response;
}

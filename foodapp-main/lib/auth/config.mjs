export const AUTH_SECRET = process.env.AUTH_SECRET?.trim() || "dev-auth-secret-change-me";

export const SESSION_COOKIE_NAME = "foodapp_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12;
export const GOOGLE_PENDING_TTL_MS = 1000 * 60 * 15;
export const PHONE_CODE_TTL_MS = 1000 * 60 * 10;
export const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60;

export const ROLES = {
  CUSTOMER: "CUSTOMER",
  ADMIN: "ADMIN",
};

export const ROLE_VALUES = Object.values(ROLES);

export const CHECKOUT_RESTRICTION_POLICY =
  "Guests can browse the site, but checkout requires a signed-in customer account with a verified phone number.";

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

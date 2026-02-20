import { NextResponse, type NextRequest } from "next/server";
import { AUTH_SECRET, SESSION_COOKIE_NAME } from "@/lib/auth/config.mjs";
import { evaluateAccessPolicy } from "@/lib/auth/policy.mjs";

type SessionPayload = {
  sub: string;
  role: string;
  email: string;
  phoneVerified: boolean;
  exp: number;
};

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padding);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function signSegment(segment: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(segment));
  return toBase64Url(new Uint8Array(signature));
}

async function decodeSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [headerPart, payloadPart, signaturePart] = parts;
  const expectedSignature = await signSegment(`${headerPart}.${payloadPart}`);

  if (expectedSignature !== signaturePart) {
    return null;
  }

  try {
    const payloadRaw = new TextDecoder().decode(fromBase64Url(payloadPart));
    const payload = JSON.parse(payloadRaw) as SessionPayload;

    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await decodeSession(token);

  const decision = evaluateAccessPolicy(pathname, session);
  if (decision.allowed) {
    return NextResponse.next();
  }

  if (decision.type === "json") {
    return NextResponse.json(
      {
        message: "Not authorized.",
        code: decision.reason,
      },
      { status: decision.status ?? 401 },
    );
  }

  const target = new URL(decision.redirectTo || "/auth/login", request.url);
  return NextResponse.redirect(target);
}

export const config = {
  matcher: [
    "/staff/:path*",
    "/checkout",
    "/orders/:path*",
    "/api/staff/:path*",
    "/api/admin/:path*",
    "/api/checkout/:path*",
  ],
};

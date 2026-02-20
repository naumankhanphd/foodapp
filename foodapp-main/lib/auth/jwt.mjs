import { createHmac, timingSafeEqual } from "node:crypto";
import { AUTH_SECRET, SESSION_TTL_SECONDS } from "./config.mjs";

function toBase64Url(input) {
  const base64 = Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return base64;
}

function fromBase64Url(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padding);
  return Buffer.from(padded, "base64");
}

function signSegment(segment) {
  return toBase64Url(createHmac("sha256", AUTH_SECRET).update(segment).digest());
}

export function signAuthToken(claims, ttlSeconds = SESSION_TTL_SECONDS) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    ...claims,
    iat: now,
    exp: now + ttlSeconds,
  };

  const headerPart = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadPart = toBase64Url(JSON.stringify(payload));
  const signaturePart = signSegment(`${headerPart}.${payloadPart}`);

  return `${headerPart}.${payloadPart}.${signaturePart}`;
}

export function verifyAuthToken(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [headerPart, payloadPart, signaturePart] = parts;
  const expectedSignature = signSegment(`${headerPart}.${payloadPart}`);

  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signaturePart);

  if (expectedBuffer.length !== actualBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(expectedBuffer, actualBuffer)) {
    return null;
  }

  try {
    const payloadRaw = fromBase64Url(payloadPart).toString("utf8");
    const payload = JSON.parse(payloadRaw);
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

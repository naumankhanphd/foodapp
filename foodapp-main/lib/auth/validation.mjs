import { AuthError } from "./errors.mjs";
import { ROLE_VALUES, ROLES } from "./config.mjs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FINNISH_PHONE_PATTERN = /^\+358[1-9]\d{4,10}$/;
const NAME_PART_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\s'.-]{0,78}$/u;

function normalizeNamePart(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function requireEmail(email) {
  const normalized = normalizeEmail(email);
  if (!EMAIL_PATTERN.test(normalized)) {
    throw new AuthError("Valid email is required.", 400, "INVALID_EMAIL");
  }
  return normalized;
}

export function requireFullName(fullName) {
  const name = normalizeNamePart(fullName);
  if (name.length < 2) {
    throw new AuthError("Full name must be at least 2 characters.", 400, "INVALID_NAME");
  }
  return name;
}

function requireNamePart(namePart, label) {
  const value = normalizeNamePart(namePart);
  if (value.length < 2 || !NAME_PART_PATTERN.test(value)) {
    throw new AuthError(`${label} must be at least 2 valid characters.`, 400, "INVALID_NAME");
  }
  return value;
}

export function requireFirstName(firstName) {
  return requireNamePart(firstName, "First name");
}

export function requireLastName(lastName) {
  return requireNamePart(lastName, "Last name");
}

export function requirePassword(password) {
  const value = String(password || "");
  if (value.length < 8) {
    throw new AuthError("Password must be at least 8 characters.", 400, "INVALID_PASSWORD");
  }
  return value;
}

export function requirePhone(phone) {
  const value = String(phone || "").trim().replace(/[^\d+]/g, "");
  if (!FINNISH_PHONE_PATTERN.test(value)) {
    throw new AuthError(
      "Phone number must be a valid Finnish number in +358 format.",
      400,
      "INVALID_PHONE",
    );
  }
  return value;
}

export function requireAddress(addressLine1, addressCity) {
  const line = String(addressLine1 || "").trim();
  const city = String(addressCity || "").trim();

  if (!line || !city) {
    throw new AuthError("Address line and city are required.", 400, "INVALID_ADDRESS");
  }

  return { addressLine1: line, addressCity: city };
}

export function requireLocation(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new AuthError("Valid location coordinates are required.", 400, "INVALID_LOCATION");
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new AuthError("Location coordinates are out of range.", 400, "INVALID_LOCATION");
  }

  return { lat: latitude, lng: longitude };
}

export function parseSignupRole(role) {
  void role;
  return ROLES.CUSTOMER;
}

export function parseRequiredRole(role) {
  if (!role) {
    return null;
  }

  const resolved = String(role).toUpperCase();
  if (!ROLE_VALUES.includes(resolved)) {
    throw new AuthError("Invalid role value.", 400, "INVALID_ROLE");
  }
  return resolved;
}

export function requireResetToken(token) {
  const value = String(token || "").trim();
  if (value.length < 16) {
    throw new AuthError("Reset token is invalid.", 400, "INVALID_RESET_TOKEN");
  }
  return value;
}

export function requirePhoneCode(code) {
  const value = String(code || "").trim();
  if (!/^\d{6}$/.test(value)) {
    throw new AuthError("Phone verification code must be 6 digits.", 400, "INVALID_PHONE_CODE");
  }
  return value;
}

import { createHash, randomBytes } from "node:crypto";
import mysql from "mysql2/promise";
import {
  AUTH_SECRET,
  GOOGLE_PENDING_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  PHONE_CODE_TTL_MS,
  ROLES,
  SESSION_COOKIE_NAME,
} from "./config.mjs";
import { AuthError } from "./errors.mjs";
import { signAuthToken, verifyAuthToken } from "./jwt.mjs";
import { hashPassword, verifyPassword } from "./password.mjs";
import { hasRequiredRole } from "./policy.mjs";
import {
  normalizeEmail,
  parseRequiredRole,
  parseSignupRole,
  requireAddress,
  requireEmail,
  requireFullName,
  requireLocation,
  requirePassword,
  requirePhone,
  requirePhoneCode,
  requireResetToken,
} from "./validation.mjs";

const MANDATORY_PROFILE_FIELDS = ["phone", "addressLine1", "addressCity"];
const DB_CACHE_KEY = "__FOODAPP_AUTH_DB_POOL__";

function requireDatabaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new AuthError("DATABASE_URL is missing.", 500, "DB_CONFIG_ERROR");
  }
  return value;
}

function getPool() {
  if (!globalThis[DB_CACHE_KEY]) {
    globalThis[DB_CACHE_KEY] = mysql.createPool({
      uri: requireDatabaseUrl(),
      connectionLimit: 6,
    });
  }
  return globalThis[DB_CACHE_KEY];
}

async function withConnection(callback) {
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    return await callback(connection);
  } finally {
    connection.release();
  }
}

async function hasColumn(connection, tableName, columnName) {
  const [rows] = await connection.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND column_name = ?
      LIMIT 1
    `,
    [tableName, columnName],
  );
  return rows.length > 0;
}

async function ensureGooglePendingTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS google_auth_pending (
      pending_token VARCHAR(191) NOT NULL,
      email VARCHAR(191) NOT NULL,
      full_name VARCHAR(191) NOT NULL,
      role_key ENUM('CUSTOMER', 'ADMIN') NOT NULL DEFAULT 'CUSTOMER',
      existing_user_id BIGINT UNSIGNED NULL,
      expires_at DATETIME(3) NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (pending_token),
      KEY idx_google_auth_pending_expires (expires_at),
      KEY idx_google_auth_pending_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensureRoleCatalog(connection) {
  const hasRoleKey = await hasColumn(connection, "user_roles", "role_key");
  if (!hasRoleKey) {
    return null;
  }

  await connection.query(
    `
      INSERT INTO user_roles (role_key, name)
      VALUES
        ('CUSTOMER', 'Customer'),
        ('ADMIN', 'Admin')
      ON DUPLICATE KEY UPDATE
        name = VALUES(name)
    `,
  );

  const [rows] = await connection.query(
    `
      SELECT id, role_key
      FROM user_roles
      WHERE role_key IN ('CUSTOMER', 'ADMIN')
    `,
  );

  const customerRoleId = Number(rows.find((entry) => String(entry.role_key) === "CUSTOMER")?.id);
  const adminRoleId = Number(rows.find((entry) => String(entry.role_key) === "ADMIN")?.id);

  if (!Number.isFinite(customerRoleId) || !Number.isFinite(adminRoleId)) {
    throw new AuthError("Role catalog is missing CUSTOMER/ADMIN.", 500, "ROLE_CONFIG_ERROR");
  }

  return {
    customerRoleId,
    adminRoleId,
  };
}

function roleFromEmail(email) {
  return normalizeEmail(email) === "admin@example.com" ? ROLES.ADMIN : ROLES.CUSTOMER;
}

function toIsoOrNull(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const asDate = new Date(value);
  if (!Number.isNaN(asDate.getTime())) {
    return asDate.toISOString();
  }
  return null;
}

function toNumberOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDbUser(row) {
  if (!row) {
    return null;
  }

  const roleRaw = String(row.role_key || "CUSTOMER").toUpperCase();
  const role = roleRaw === ROLES.ADMIN ? ROLES.ADMIN : ROLES.CUSTOMER;

  return {
    id: String(row.id),
    email: normalizeEmail(row.email),
    fullName: String(row.full_name || ""),
    role,
    provider: row.password_hash ? "password" : "google",
    passwordHash: row.password_hash || null,
    phone: row.phone || null,
    addressLine1: row.address_line_1 || null,
    addressCity: row.address_city || null,
    addressPostalCode: row.address_postal_code || null,
    lat: toNumberOrNull(row.lat),
    lng: toNumberOrNull(row.lng),
    phoneVerifiedAt: toIsoOrNull(row.phone_verified_at),
    createdAt: toIsoOrNull(row.created_at) || new Date().toISOString(),
  };
}

async function findDbUserByEmail(connection, email) {
  const hasRoleId = await hasColumn(connection, "users", "role_id");

  if (hasRoleId) {
    const [rows] = await connection.query(
      `
        SELECT
          u.id,
          u.email,
          u.password_hash,
          u.full_name,
          u.created_at,
          ur.role_key,
          cp.phone,
          cp.phone_verified_at,
          cp.address_line_1,
          cp.address_city,
          cp.address_postal_code,
          cp.lat,
          cp.lng
        FROM users u
        LEFT JOIN user_roles ur ON ur.id = u.role_id
        LEFT JOIN customer_profiles cp ON cp.user_id = u.id
        WHERE u.email = ?
        LIMIT 1
      `,
      [email],
    );

    return normalizeDbUser(rows[0]);
  }

  const [rows] = await connection.query(
    `
      SELECT
        u.id,
        u.email,
        u.password_hash,
        u.full_name,
        u.created_at,
        (
          SELECT CASE
            WHEN SUM(CASE WHEN role = 'ADMIN' THEN 1 ELSE 0 END) > 0 THEN 'ADMIN'
            ELSE 'CUSTOMER'
          END
          FROM user_roles r
          WHERE r.user_id = u.id
        ) AS role_key,
        cp.phone,
        cp.phone_verified_at,
        cp.address_line_1,
        cp.address_city,
        cp.address_postal_code,
        cp.lat,
        cp.lng
      FROM users u
      LEFT JOIN customer_profiles cp ON cp.user_id = u.id
      WHERE u.email = ?
      LIMIT 1
    `,
    [email],
  );

  return normalizeDbUser(rows[0]);
}

async function findDbUserById(connection, userId) {
  const hasRoleId = await hasColumn(connection, "users", "role_id");

  if (hasRoleId) {
    const [rows] = await connection.query(
      `
        SELECT
          u.id,
          u.email,
          u.password_hash,
          u.full_name,
          u.created_at,
          ur.role_key,
          cp.phone,
          cp.phone_verified_at,
          cp.address_line_1,
          cp.address_city,
          cp.address_postal_code,
          cp.lat,
          cp.lng
        FROM users u
        LEFT JOIN user_roles ur ON ur.id = u.role_id
        LEFT JOIN customer_profiles cp ON cp.user_id = u.id
        WHERE u.id = ?
        LIMIT 1
      `,
      [Number(userId)],
    );

    return normalizeDbUser(rows[0]);
  }

  const [rows] = await connection.query(
    `
      SELECT
        u.id,
        u.email,
        u.password_hash,
        u.full_name,
        u.created_at,
        (
          SELECT CASE
            WHEN SUM(CASE WHEN role = 'ADMIN' THEN 1 ELSE 0 END) > 0 THEN 'ADMIN'
            ELSE 'CUSTOMER'
          END
          FROM user_roles r
          WHERE r.user_id = u.id
        ) AS role_key,
        cp.phone,
        cp.phone_verified_at,
        cp.address_line_1,
        cp.address_city,
        cp.address_postal_code,
        cp.lat,
        cp.lng
      FROM users u
      LEFT JOIN customer_profiles cp ON cp.user_id = u.id
      WHERE u.id = ?
      LIMIT 1
    `,
    [Number(userId)],
  );

  return normalizeDbUser(rows[0]);
}

async function assignRoleForUser(connection, userId, email) {
  const normalizedEmail = normalizeEmail(email);
  const targetRole = normalizedEmail === "admin@example.com" ? ROLES.ADMIN : ROLES.CUSTOMER;

  const hasRoleId = await hasColumn(connection, "users", "role_id");
  if (hasRoleId) {
    const roleCatalog = await ensureRoleCatalog(connection);
    if (!roleCatalog) {
      throw new AuthError("Role catalog not available.", 500, "ROLE_CONFIG_ERROR");
    }

    const roleId = targetRole === ROLES.ADMIN ? roleCatalog.adminRoleId : roleCatalog.customerRoleId;
    await connection.query("UPDATE users SET role_id = ? WHERE id = ?", [roleId, Number(userId)]);
    return;
  }

  await connection.query("DELETE FROM user_roles WHERE user_id = ?", [Number(userId)]);
  await connection.query("INSERT INTO user_roles (user_id, role) VALUES (?, ?)", [Number(userId), targetRole]);
}

async function createDbUser(connection, { email, fullName, passwordHash }) {
  const hasRoleId = await hasColumn(connection, "users", "role_id");
  let roleId = null;

  if (hasRoleId) {
    const roleCatalog = await ensureRoleCatalog(connection);
    if (!roleCatalog) {
      throw new AuthError("Role catalog not available.", 500, "ROLE_CONFIG_ERROR");
    }

    roleId = roleFromEmail(email) === ROLES.ADMIN ? roleCatalog.adminRoleId : roleCatalog.customerRoleId;
  }

  if (hasRoleId) {
    const [result] = await connection.query(
      `
        INSERT INTO users (email, password_hash, full_name, role_id)
        VALUES (?, ?, ?, ?)
      `,
      [email, passwordHash, fullName, roleId],
    );
    return String(result.insertId);
  }

  const [result] = await connection.query(
    `
      INSERT INTO users (email, password_hash, full_name)
      VALUES (?, ?, ?)
    `,
    [email, passwordHash, fullName],
  );

  const userId = String(result.insertId);
  await assignRoleForUser(connection, userId, email);
  return userId;
}

async function updateDbUser(connection, userId, patch) {
  const sets = [];
  const params = [];

  if (Object.prototype.hasOwnProperty.call(patch, "fullName")) {
    sets.push("full_name = ?");
    params.push(patch.fullName);
  }

  if (Object.prototype.hasOwnProperty.call(patch, "passwordHash")) {
    sets.push("password_hash = ?");
    params.push(patch.passwordHash);
  }

  if (sets.length === 0) {
    return;
  }

  params.push(Number(userId));
  await connection.query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, params);
}

async function upsertCustomerProfile(connection, userId, patch) {
  await connection.query(
    `
      INSERT INTO customer_profiles (
        user_id,
        phone,
        phone_verified_at,
        address_line_1,
        address_city,
        address_postal_code,
        lat,
        lng
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        phone = VALUES(phone),
        phone_verified_at = VALUES(phone_verified_at),
        address_line_1 = VALUES(address_line_1),
        address_city = VALUES(address_city),
        address_postal_code = VALUES(address_postal_code),
        lat = VALUES(lat),
        lng = VALUES(lng)
    `,
    [
      Number(userId),
      patch.phone ?? null,
      patch.phoneVerifiedAt ?? null,
      patch.addressLine1 ?? null,
      patch.addressCity ?? null,
      patch.addressPostalCode ?? null,
      patch.lat ?? null,
      patch.lng ?? null,
    ],
  );
}

function nowMs() {
  return Date.now();
}

function hashOneWay(value) {
  return createHash("sha256").update(`${value}:${AUTH_SECRET}`).digest("hex");
}

function randomToken(size = 24) {
  return randomBytes(size).toString("hex");
}

export function getMissingMandatoryProfileFields(userLike) {
  const user = userLike || {};
  const missing = [];

  if (!user.phone) {
    missing.push("phone");
  }
  if (!user.addressLine1) {
    missing.push("addressLine1");
  }
  if (!user.addressCity) {
    missing.push("addressCity");
  }

  return missing;
}

export function hasMandatoryProfileFields(userLike) {
  return getMissingMandatoryProfileFields(userLike).length === 0;
}

function resolveLocationPatch(input, fallbackUserLike) {
  const hasLat = input.lat !== null && input.lat !== undefined && String(input.lat).trim() !== "";
  const hasLng = input.lng !== null && input.lng !== undefined && String(input.lng).trim() !== "";

  if (hasLat || hasLng) {
    const { lat, lng } = requireLocation(input.lat, input.lng);
    return { lat, lng };
  }

  const fallbackUser = fallbackUserLike || {};
  return {
    lat: typeof fallbackUser.lat === "number" ? fallbackUser.lat : null,
    lng: typeof fallbackUser.lng === "number" ? fallbackUser.lng : null,
  };
}

export function sanitizeUser(user) {
  return {
    id: String(user.id),
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    provider: user.provider,
    phone: user.phone,
    addressLine1: user.addressLine1,
    addressCity: user.addressCity,
    lat: user.lat,
    lng: user.lng,
    phoneVerified: Boolean(user.phoneVerifiedAt) || Boolean(user.phoneVerified),
    createdAt: user.createdAt,
  };
}

function assertRoleCompatibility(userRole, requiredRole) {
  if (!requiredRole) {
    return;
  }

  // Admin can use customer login entrypoints too.
  if (requiredRole === ROLES.CUSTOMER && userRole === ROLES.ADMIN) {
    return;
  }

  if (!hasRequiredRole(userRole, [requiredRole])) {
    throw new AuthError("You do not have access to this area.", 403, "ROLE_FORBIDDEN");
  }
}

export async function registerWithPassword(input) {
  const email = requireEmail(input.email);
  const fullName = requireFullName(input.fullName);
  const password = requirePassword(input.password);
  parseSignupRole(input.role);

  return await withConnection(async (connection) => {
    const existing = await findDbUserByEmail(connection, email);
    if (existing) {
      throw new AuthError("Email already exists.", 409, "EMAIL_EXISTS");
    }

    const userId = await createDbUser(connection, {
      email,
      fullName,
      passwordHash: hashPassword(password),
    });

    const created = await findDbUserById(connection, userId);
    if (!created) {
      throw new AuthError("Unable to create account.", 500, "USER_CREATE_FAILED");
    }

    return sanitizeUser(created);
  });
}

export async function loginWithPassword(input) {
  const email = requireEmail(input.email);
  const password = requirePassword(input.password);
  const requiredRole = parseRequiredRole(input.requiredRole);

  return await withConnection(async (connection) => {
    const user = await findDbUserByEmail(connection, email);
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      throw new AuthError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
    }

    assertRoleCompatibility(user.role, requiredRole);
    return sanitizeUser(user);
  });
}

export async function beginGoogleAuth(input) {
  const email = requireEmail(input.email);
  const fullName = requireFullName(input.fullName || "Google User");
  const requiredRole = parseRequiredRole(input.requiredRole || input.role);

  return await withConnection(async (connection) => {
    await ensureGooglePendingTable(connection);
    const existing = await findDbUserByEmail(connection, email);

    if (existing) {
      assertRoleCompatibility(existing.role, requiredRole);

      if (hasMandatoryProfileFields(existing)) {
        return {
          requiresCompletion: false,
          user: sanitizeUser(existing),
        };
      }
    }

    if (requiredRole && requiredRole !== ROLES.CUSTOMER) {
      throw new AuthError(
        "Only admins can access this area. New accounts are created as customer.",
        403,
        "ROLE_FORBIDDEN",
      );
    }

    const pendingToken = randomToken();
    const expiresAt = new Date(nowMs() + GOOGLE_PENDING_TTL_MS);

    await connection.query(
      `
        INSERT INTO google_auth_pending (
          pending_token,
          email,
          full_name,
          role_key,
          existing_user_id,
          expires_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        pendingToken,
        email,
        fullName,
        existing?.role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.CUSTOMER,
        existing ? Number(existing.id) : null,
        expiresAt,
      ],
    );

    return {
      requiresCompletion: true,
      pendingToken,
      missingFields: [...MANDATORY_PROFILE_FIELDS],
    };
  });
}

export async function completeGoogleProfile(input) {
  const pendingToken = String(input.pendingToken || "").trim();
  if (!pendingToken) {
    throw new AuthError("Pending token is required.", 400, "PENDING_TOKEN_REQUIRED");
  }

  const phone = requirePhone(input.phone);
  const { addressLine1, addressCity } = requireAddress(input.addressLine1, input.addressCity);

  return await withConnection(async (connection) => {
    await ensureGooglePendingTable(connection);

    const [rows] = await connection.query(
      `
        SELECT pending_token, email, full_name, role_key, existing_user_id, expires_at
        FROM google_auth_pending
        WHERE pending_token = ?
        LIMIT 1
      `,
      [pendingToken],
    );

    const pending = rows[0];
    if (!pending) {
      throw new AuthError("Google session expired. Please sign in again.", 400, "PENDING_TOKEN_INVALID");
    }

    const expiresAt = new Date(pending.expires_at).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt < nowMs()) {
      await connection.query("DELETE FROM google_auth_pending WHERE pending_token = ?", [pendingToken]);
      throw new AuthError("Google session expired. Please sign in again.", 400, "PENDING_TOKEN_INVALID");
    }

    let user = pending.existing_user_id
      ? await findDbUserById(connection, pending.existing_user_id)
      : await findDbUserByEmail(connection, pending.email);

    if (!user) {
      const newUserId = await createDbUser(connection, {
        email: pending.email,
        fullName: pending.full_name,
        passwordHash: null,
      });
      user = await findDbUserById(connection, newUserId);
    } else {
      await updateDbUser(connection, user.id, {
        fullName: pending.full_name,
      });
    }

    if (!user) {
      throw new AuthError("Unable to update profile.", 500, "PROFILE_UPDATE_FAILED");
    }

    const { lat, lng } = resolveLocationPatch(input, user);

    await upsertCustomerProfile(connection, user.id, {
      phone,
      phoneVerifiedAt: null,
      addressLine1,
      addressCity,
      addressPostalCode: user.addressPostalCode || null,
      lat,
      lng,
    });

    await connection.query("DELETE FROM google_auth_pending WHERE pending_token = ?", [pendingToken]);

    const updated = await findDbUserById(connection, user.id);
    if (!updated) {
      throw new AuthError("Unable to update profile.", 500, "PROFILE_UPDATE_FAILED");
    }

    return sanitizeUser(updated);
  });
}

export async function completeCustomerProfile(input) {
  const userId = String(input.userId || "").trim();
  if (!userId) {
    throw new AuthError("User not found.", 404, "USER_NOT_FOUND");
  }

  const phone = requirePhone(input.phone);
  const { addressLine1, addressCity } = requireAddress(input.addressLine1, input.addressCity);

  return await withConnection(async (connection) => {
    const user = await findDbUserById(connection, userId);
    if (!user) {
      throw new AuthError("User not found.", 404, "USER_NOT_FOUND");
    }

    const phoneUnchanged = user.phone && user.phone === phone;
    const phoneVerifiedAt =
      phoneUnchanged && user.phoneVerifiedAt ? new Date(user.phoneVerifiedAt) : null;
    const { lat, lng } = resolveLocationPatch(input, user);

    await upsertCustomerProfile(connection, user.id, {
      phone,
      phoneVerifiedAt,
      addressLine1,
      addressCity,
      addressPostalCode: user.addressPostalCode || null,
      lat,
      lng,
    });

    const updated = await findDbUserById(connection, user.id);
    if (!updated) {
      throw new AuthError("Unable to update profile.", 500, "PROFILE_UPDATE_FAILED");
    }

    return sanitizeUser(updated);
  });
}

export function createSessionTokenForUser(userLike) {
  const effectiveUser = sanitizeUser(userLike);

  return signAuthToken({
    sub: String(effectiveUser.id),
    role: effectiveUser.role,
    email: effectiveUser.email,
    fullName: effectiveUser.fullName,
    provider: effectiveUser.provider,
    phone: effectiveUser.phone,
    addressLine1: effectiveUser.addressLine1,
    addressCity: effectiveUser.addressCity,
    lat: effectiveUser.lat,
    lng: effectiveUser.lng,
    phoneVerified: Boolean(effectiveUser.phoneVerified),
    createdAt: effectiveUser.createdAt,
  });
}

export function readSessionFromToken(token) {
  const claims = verifyAuthToken(token);
  if (!claims || typeof claims.sub !== "string") {
    return null;
  }

  const role = String(claims.role || "").toUpperCase();
  if (role !== ROLES.CUSTOMER && role !== ROLES.ADMIN) {
    return null;
  }

  const email = normalizeEmail(claims.email || "");
  if (!email) {
    return null;
  }

  const user = {
    id: String(claims.sub),
    email,
    fullName: String(claims.fullName || ""),
    role,
    provider: String(claims.provider || "password"),
    phone: claims.phone || null,
    addressLine1: claims.addressLine1 || null,
    addressCity: claims.addressCity || null,
    lat: toNumberOrNull(claims.lat),
    lng: toNumberOrNull(claims.lng),
    phoneVerified: Boolean(claims.phoneVerified),
    createdAt: claims.createdAt || null,
  };

  return {
    claims,
    user,
  };
}

export function readSessionFromRequest(request) {
  const cookieToken = request.cookies?.get?.(SESSION_COOKIE_NAME)?.value;
  if (!cookieToken) {
    return null;
  }

  return readSessionFromToken(cookieToken);
}

export async function sendPhoneCode(input) {
  const userId = String(input.userId || "").trim();
  if (!userId) {
    throw new AuthError("User not found.", 404, "USER_NOT_FOUND");
  }

  return await withConnection(async (connection) => {
    const user = await findDbUserById(connection, userId);
    if (!user) {
      throw new AuthError("User not found.", 404, "USER_NOT_FOUND");
    }
    if (!user.phone) {
      throw new AuthError("Phone number is required before verification.", 400, "PHONE_REQUIRED");
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = hashOneWay(code);
    const expiresAt = new Date(nowMs() + PHONE_CODE_TTL_MS);

    await connection.query(
      "DELETE FROM phone_verification_codes WHERE user_id = ? AND consumed_at IS NULL",
      [Number(userId)],
    );

    await connection.query(
      `
        INSERT INTO phone_verification_codes (
          user_id,
          phone,
          code_hash,
          attempts,
          max_attempts,
          expires_at
        ) VALUES (?, ?, ?, 0, 5, ?)
      `,
      [Number(userId), user.phone, codeHash, expiresAt],
    );

    return {
      sentTo: user.phone,
      devCode: process.env.NODE_ENV === "production" ? undefined : code,
    };
  });
}

export async function verifyPhoneCode(input) {
  const userId = String(input.userId || "").trim();
  const code = requirePhoneCode(input.code);

  return await withConnection(async (connection) => {
    const user = await findDbUserById(connection, userId);
    if (!user) {
      throw new AuthError("User not found.", 404, "USER_NOT_FOUND");
    }

    const [rows] = await connection.query(
      `
        SELECT id, code_hash, attempts, max_attempts, expires_at
        FROM phone_verification_codes
        WHERE user_id = ?
          AND consumed_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [Number(userId)],
    );

    const record = rows[0];
    if (!record) {
      throw new AuthError(
        "Verification code expired. Please request a new code.",
        400,
        "PHONE_CODE_EXPIRED",
      );
    }

    const expiresAt = new Date(record.expires_at).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt < nowMs()) {
      await connection.query("UPDATE phone_verification_codes SET consumed_at = NOW(3) WHERE id = ?", [record.id]);
      throw new AuthError(
        "Verification code expired. Please request a new code.",
        400,
        "PHONE_CODE_EXPIRED",
      );
    }

    const providedHash = hashOneWay(code);
    if (providedHash !== record.code_hash) {
      const nextAttempts = Number(record.attempts || 0) + 1;
      if (nextAttempts >= Number(record.max_attempts || 5)) {
        await connection.query(
          "UPDATE phone_verification_codes SET attempts = ?, consumed_at = NOW(3) WHERE id = ?",
          [nextAttempts, record.id],
        );
        throw new AuthError("Too many failed attempts. Request a new code.", 429, "PHONE_CODE_LOCKED");
      }

      await connection.query(
        "UPDATE phone_verification_codes SET attempts = ? WHERE id = ?",
        [nextAttempts, record.id],
      );
      throw new AuthError("Invalid verification code.", 400, "PHONE_CODE_INVALID");
    }

    await connection.query("UPDATE phone_verification_codes SET consumed_at = NOW(3) WHERE id = ?", [record.id]);
    await upsertCustomerProfile(connection, user.id, {
      phone: user.phone,
      phoneVerifiedAt: new Date(),
      addressLine1: user.addressLine1,
      addressCity: user.addressCity,
      addressPostalCode: user.addressPostalCode,
      lat: user.lat,
      lng: user.lng,
    });

    const updated = await findDbUserById(connection, user.id);
    if (!updated) {
      throw new AuthError("User not found.", 404, "USER_NOT_FOUND");
    }

    return sanitizeUser(updated);
  });
}

export async function requestPasswordReset(input) {
  const email = normalizeEmail(input.email);
  if (!email) {
    return { delivered: true };
  }

  return await withConnection(async (connection) => {
    const user = await findDbUserByEmail(connection, email);
    if (!user) {
      return { delivered: true };
    }

    const token = randomToken(32);
    const tokenHash = hashOneWay(token);
    const expiresAt = new Date(nowMs() + PASSWORD_RESET_TTL_MS);

    await connection.query(
      `
        INSERT INTO password_reset_tokens (
          user_id,
          token_hash,
          expires_at,
          consumed_at
        ) VALUES (?, ?, ?, NULL)
      `,
      [Number(user.id), tokenHash, expiresAt],
    );

    return {
      delivered: true,
      devResetToken: process.env.NODE_ENV === "production" ? undefined : token,
    };
  });
}

export async function resetPassword(input) {
  const token = requireResetToken(input.token);
  const nextPassword = requirePassword(input.password);
  const tokenHash = hashOneWay(token);

  return await withConnection(async (connection) => {
    const [rows] = await connection.query(
      `
        SELECT id, user_id, expires_at, consumed_at
        FROM password_reset_tokens
        WHERE token_hash = ?
        LIMIT 1
      `,
      [tokenHash],
    );

    const record = rows[0];
    const expired = !record || new Date(record.expires_at).getTime() < nowMs();
    const consumed = Boolean(record?.consumed_at);
    if (!record || expired || consumed) {
      throw new AuthError("Reset token is invalid or expired.", 400, "RESET_TOKEN_INVALID");
    }

    const user = await findDbUserById(connection, record.user_id);
    if (!user) {
      throw new AuthError("User not found.", 404, "USER_NOT_FOUND");
    }

    await updateDbUser(connection, user.id, {
      passwordHash: hashPassword(nextPassword),
    });
    await connection.query(
      "UPDATE password_reset_tokens SET consumed_at = NOW(3) WHERE id = ?",
      [record.id],
    );

    const updated = await findDbUserById(connection, user.id);
    if (!updated) {
      throw new AuthError("User not found.", 404, "USER_NOT_FOUND");
    }

    return sanitizeUser(updated);
  });
}

export function getGuestPolicy() {
  return {
    guestCanBrowse: true,
    checkoutRestricted: true,
    restriction: "CUSTOMER_LOGIN_AND_VERIFIED_PHONE",
  };
}

export function listOutboxMessages() {
  return [];
}

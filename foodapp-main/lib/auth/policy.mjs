import { CHECKOUT_RESTRICTION_POLICY, ROLES } from "./config.mjs";

export { CHECKOUT_RESTRICTION_POLICY };

export function isStaffRole(role) {
  return role === ROLES.ADMIN;
}

export function isCustomerRole(role) {
  return role === ROLES.CUSTOMER;
}

export function hasRequiredRole(role, requiredRoles) {
  return Array.isArray(requiredRoles) && requiredRoles.includes(role);
}

function hasMandatoryProfile(session) {
  return (
    Boolean(session?.phone) &&
    Boolean(session?.addressLine1) &&
    Boolean(session?.addressCity)
  );
}

export function evaluateAccessPolicy(pathname, session) {
  if (pathname.startsWith("/staff/login")) {
    return { allowed: true };
  }

  if (pathname.startsWith("/api/staff/")) {
    if (!session) {
      return { allowed: false, type: "json", status: 401, reason: "AUTH_REQUIRED" };
    }
    if (!isStaffRole(session.role)) {
      return { allowed: false, type: "json", status: 403, reason: "ROLE_FORBIDDEN" };
    }
    return { allowed: true };
  }

  if (pathname.startsWith("/api/admin/")) {
    if (!session) {
      return { allowed: false, type: "json", status: 401, reason: "AUTH_REQUIRED" };
    }
    if (!isStaffRole(session.role)) {
      return { allowed: false, type: "json", status: 403, reason: "ROLE_FORBIDDEN" };
    }
    return { allowed: true };
  }

  if (pathname.startsWith("/api/checkout/")) {
    if (!session) {
      return { allowed: false, type: "json", status: 401, reason: "AUTH_REQUIRED" };
    }

    if (!isCustomerRole(session.role)) {
      return { allowed: false, type: "json", status: 403, reason: "ROLE_FORBIDDEN" };
    }

    if (!hasMandatoryProfile(session)) {
      return {
        allowed: false,
        type: "json",
        status: 403,
        reason: "PROFILE_COMPLETION_REQUIRED",
      };
    }

    if (!session.phoneVerified) {
      return {
        allowed: false,
        type: "json",
        status: 403,
        reason: "PHONE_VERIFICATION_REQUIRED",
      };
    }

    return { allowed: true };
  }

  if (pathname.startsWith("/staff")) {
    if (!session) {
      return { allowed: false, type: "redirect", redirectTo: "/staff/login", reason: "AUTH_REQUIRED" };
    }
    if (!isStaffRole(session.role)) {
      return { allowed: false, type: "redirect", redirectTo: "/auth/login?error=admin_role_required", reason: "ROLE_FORBIDDEN" };
    }
    return { allowed: true };
  }

  if (pathname.startsWith("/checkout") || pathname.startsWith("/orders/")) {
    if (!session) {
      return {
        allowed: false,
        type: "redirect",
        redirectTo: `/auth/login?next=${encodeURIComponent(pathname)}`,
        reason: "AUTH_REQUIRED",
      };
    }

    if (!isCustomerRole(session.role)) {
      return {
        allowed: false,
        type: "redirect",
        redirectTo: "/auth/login?error=customer_role_required",
        reason: "ROLE_FORBIDDEN",
      };
    }

    if (!hasMandatoryProfile(session)) {
      return {
        allowed: false,
        type: "redirect",
        redirectTo: `/auth/complete-profile?next=${encodeURIComponent(pathname)}`,
        reason: "PROFILE_COMPLETION_REQUIRED",
      };
    }

    if (!session.phoneVerified) {
      return {
        allowed: false,
        type: "redirect",
        redirectTo: `/auth/verify-phone?next=${encodeURIComponent(pathname)}`,
        reason: "PHONE_VERIFICATION_REQUIRED",
      };
    }

    return { allowed: true };
  }

  return { allowed: true };
}

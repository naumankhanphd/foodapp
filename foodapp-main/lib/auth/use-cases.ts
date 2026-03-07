import {
  beginGoogleAuth,
  beginPasswordSignup,
  completeCustomerProfile,
  completeGoogleProfile,
  createSessionTokenForUser,
  loginWithPassword,
  requestPasswordReset,
  resetPassword,
  sendPhoneCode,
  verifyPhoneCode,
} from "./commands.ts";
import { getGuestPolicy, getMissingMandatoryProfileFields } from "./queries.ts";

export async function loginWithPasswordUseCase(body: Record<string, unknown>) {
  const user = await loginWithPassword(body);
  const sessionToken = createSessionTokenForUser(user);
  const missingFields = user.role === "CUSTOMER" ? getMissingMandatoryProfileFields(user) : [];
  return {
    user,
    sessionToken,
    requiresCompletion: missingFields.length > 0,
    missingFields,
  };
}

export async function beginPasswordSignupUseCase(body: Record<string, unknown>) {
  const result = await beginPasswordSignup(body);
  return {
    requiresCompletion: true as const,
    pendingToken: result.pendingToken,
    missingFields: result.missingFields,
    policy: {
      guestCanBrowse: true,
      checkoutRequiresLogin: true,
    },
  };
}

export async function beginGoogleAuthUseCase(body: Record<string, unknown>) {
  const result = await beginGoogleAuth(body);
  if (result.requiresCompletion) {
    return {
      requiresCompletion: true as const,
      pendingToken: result.pendingToken,
      missingFields: result.missingFields,
    };
  }

  if (!result.user) {
    throw new Error("Google auth user payload is missing.");
  }

  return {
    requiresCompletion: false as const,
    user: result.user,
    sessionToken: createSessionTokenForUser(result.user),
  };
}

export async function completeProfileUseCase(input: {
  body: Record<string, unknown>;
  userId?: string;
}) {
  const pendingToken = String(input.body.pendingToken || "").trim();
  const user = pendingToken
    ? await completeGoogleProfile(input.body)
    : await completeCustomerProfile({
        ...input.body,
        userId: input.userId,
      });

  let devPhoneCode: string | undefined;
  const requiresPhoneVerification = !user.phoneVerified;
  if (requiresPhoneVerification) {
    const phoneCode = await sendPhoneCode({ userId: user.id });
    devPhoneCode = phoneCode.devCode;
  }

  return {
    user,
    requiresPhoneVerification,
    devPhoneCode,
    sessionToken: createSessionTokenForUser(user),
  };
}

export function getMeUseCase(user: unknown) {
  return { user, guestPolicy: getGuestPolicy() };
}

export async function sendPhoneCodeUseCase(userId: string) {
  const result = await sendPhoneCode({ userId });
  return {
    success: true,
    message: "Verification code sent.",
    devPhoneCode: result.devCode,
  };
}

export async function verifyPhoneCodeUseCase(input: { userId: string; code: unknown }) {
  const user = await verifyPhoneCode({
    userId: input.userId,
    code: input.code,
  });

  return {
    success: true,
    user,
    sessionToken: createSessionTokenForUser(user),
  };
}

export async function requestPasswordResetUseCase(body: Record<string, unknown>) {
  const result = await requestPasswordReset(body);
  return {
    success: true,
    message: "If that email exists, a reset link has been sent.",
    devResetToken: result.devResetToken,
  };
}

export async function resetPasswordUseCase(body: Record<string, unknown>) {
  await resetPassword(body);
  return { success: true, message: "Password updated successfully." };
}

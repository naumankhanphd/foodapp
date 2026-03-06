import { NextResponse } from "next/server";
import {
  createSessionTokenForUser,
  getMissingMandatoryProfileFields,
  loginWithPassword,
} from "@/lib/auth/service.ts";
import { parseJsonRequest, toErrorResponse, withSessionCookie } from "@/lib/auth/http.ts";

export async function POST(request: Request) {
  try {
    const body = await parseJsonRequest(request);
    const user = await loginWithPassword(body);
    const sessionToken = createSessionTokenForUser(user);
    const missingFields = user.role === "CUSTOMER" ? getMissingMandatoryProfileFields(user) : [];
    const requiresCompletion = missingFields.length > 0;

    const response = NextResponse.json({ user, requiresCompletion, missingFields });
    return withSessionCookie(response, sessionToken);
  } catch (error) {
    return toErrorResponse(error);
  }
}

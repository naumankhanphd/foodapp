import { NextResponse } from "next/server";
import { createSessionTokenForUser, registerWithPassword } from "@/lib/auth/service.mjs";
import { parseJsonRequest, toErrorResponse, withSessionCookie } from "@/lib/auth/http.mjs";

export async function POST(request: Request) {
  try {
    const body = await parseJsonRequest(request);
    const user = await registerWithPassword(body);
    const sessionToken = createSessionTokenForUser(user);

    const response = NextResponse.json({
      user,
      policy: {
        guestCanBrowse: true,
        checkoutRequiresLogin: true,
      },
    });

    return withSessionCookie(response, sessionToken);
  } catch (error) {
    return toErrorResponse(error);
  }
}

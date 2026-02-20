import { NextResponse } from "next/server";
import { getGuestPolicy } from "@/lib/auth/service.mjs";
import { getSessionOrThrow, toErrorResponse } from "@/lib/auth/http.mjs";

export async function GET(request: Request) {
  try {
    const session = getSessionOrThrow(request);
    return NextResponse.json({ user: session.user, guestPolicy: getGuestPolicy() });
  } catch (error) {
    return toErrorResponse(error);
  }
}

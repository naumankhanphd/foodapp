import { NextResponse } from "next/server";
import { getGuestPolicy } from "@/lib/auth/service.ts";
import { getSessionOrThrow, toErrorResponse } from "@/lib/auth/http.ts";

export async function GET(request: Request) {
  try {
    const session = getSessionOrThrow(request);
    return NextResponse.json({ user: session.user, guestPolicy: getGuestPolicy() });
  } catch (error) {
    return toErrorResponse(error);
  }
}

import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/http.ts";

export async function POST() {
  const response = NextResponse.json({ success: true });
  return clearSessionCookie(response);
}

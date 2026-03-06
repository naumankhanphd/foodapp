import { NextResponse } from "next/server";
import { resetPassword } from "@/lib/auth/service.ts";
import { parseJsonRequest, toErrorResponse } from "@/lib/auth/http.ts";

export async function POST(request: Request) {
  try {
    const body = await parseJsonRequest(request);
    await resetPassword(body);
    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    return toErrorResponse(error);
  }
}

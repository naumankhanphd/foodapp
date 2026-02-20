import { NextResponse } from "next/server";
import { resetPassword } from "@/lib/auth/service.mjs";
import { parseJsonRequest, toErrorResponse } from "@/lib/auth/http.mjs";

export async function POST(request: Request) {
  try {
    const body = await parseJsonRequest(request);
    await resetPassword(body);
    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    return toErrorResponse(error);
  }
}

import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/auth/service.mjs";
import { parseJsonRequest, toErrorResponse } from "@/lib/auth/http.mjs";

export async function POST(request: Request) {
  try {
    const body = await parseJsonRequest(request);
    const result = await requestPasswordReset(body);

    return NextResponse.json({
      success: true,
      message: "If that email exists, a reset link has been sent.",
      devResetToken: result.devResetToken,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

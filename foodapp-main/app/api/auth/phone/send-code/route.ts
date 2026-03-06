import { NextResponse } from "next/server";
import { sendPhoneCode } from "@/lib/auth/service.ts";
import { getSessionOrThrow, toErrorResponse } from "@/lib/auth/http.ts";

export async function POST(request: Request) {
  try {
    const session = getSessionOrThrow(request);
    const result = await sendPhoneCode({ userId: session.user.id });
    return NextResponse.json({
      success: true,
      message: "Verification code sent.",
      devPhoneCode: result.devCode,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

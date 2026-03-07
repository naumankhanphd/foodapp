import { NextResponse } from "next/server";
import { sendPhoneCodeUseCase } from "@/lib/auth/use-cases.ts";
import { getSessionOrThrow, toErrorResponse } from "@/lib/auth/http.ts";

export async function POST(request: Request) {
  try {
    const session = getSessionOrThrow(request);
    const result = await sendPhoneCodeUseCase(session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

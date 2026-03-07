import { NextResponse } from "next/server";
import { resetPasswordUseCase } from "@/lib/auth/use-cases.ts";
import { parseJsonRequest, toErrorResponse } from "@/lib/auth/http.ts";

export async function POST(request: Request) {
  try {
    const body = await parseJsonRequest(request);
    return NextResponse.json(await resetPasswordUseCase(body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

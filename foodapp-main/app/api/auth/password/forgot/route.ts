import { NextResponse } from "next/server";
import { requestPasswordResetUseCase } from "@/lib/auth/use-cases.ts";
import { parseJsonRequest, toErrorResponse } from "@/lib/auth/http.ts";

export async function POST(request: Request) {
  try {
    const body = await parseJsonRequest(request);
    return NextResponse.json(await requestPasswordResetUseCase(body));
  } catch (error) {
    return toErrorResponse(error);
  }
}

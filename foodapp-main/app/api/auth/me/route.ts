import { NextResponse } from "next/server";
import { getMeUseCase } from "@/lib/auth/use-cases.ts";
import { getSessionOrThrow, toErrorResponse } from "@/lib/auth/http.ts";

export async function GET(request: Request) {
  try {
    const session = getSessionOrThrow(request);
    return NextResponse.json(getMeUseCase(session.user));
  } catch (error) {
    return toErrorResponse(error);
  }
}

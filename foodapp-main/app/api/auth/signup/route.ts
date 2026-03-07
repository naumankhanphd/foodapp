import { NextResponse } from "next/server";
import { beginPasswordSignupUseCase } from "@/lib/auth/use-cases.ts";
import { parseJsonRequest, toErrorResponse } from "@/lib/auth/http.ts";

export async function POST(request: Request) {
  try {
    const body = await parseJsonRequest(request);
    const result = await beginPasswordSignupUseCase(body);
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

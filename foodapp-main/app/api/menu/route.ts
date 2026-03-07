import { NextResponse } from "next/server";
import { listPublicMenuUseCase } from "@/lib/menu/use-cases.ts";
import { toErrorResponse } from "@/lib/auth/http.ts";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const menu = await listPublicMenuUseCase({
      search: searchParams.get("search") || "",
      categoryId: searchParams.get("categoryId") || undefined,
    });

    return NextResponse.json(menu);
  } catch (error) {
    return toErrorResponse(error);
  }
}

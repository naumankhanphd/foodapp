import { NextResponse } from "next/server";
import { listPublicMenuFromDb } from "@/lib/menu/drizzle-menu";
import { toErrorResponse } from "@/lib/auth/http.mjs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const menu = await listPublicMenuFromDb({
      search: searchParams.get("search") || "",
      categoryId: searchParams.get("categoryId") || undefined,
    });

    return NextResponse.json(menu);
  } catch (error) {
    return toErrorResponse(error);
  }
}

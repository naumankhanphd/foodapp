import { NextResponse } from "next/server";
import { ROLES } from "@/lib/auth/config.mjs";
import { getSessionOrThrow, parseJsonRequest, toErrorResponse } from "@/lib/auth/http.mjs";
import { createItemInDb, listAdminItemsFromDb } from "@/lib/menu/drizzle-menu";
import { parseListQuery, validateItemCreate } from "@/lib/menu/validation.mjs";

export async function GET(request: Request) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const { searchParams } = new URL(request.url);
    const { page, pageSize, search } = parseListQuery(searchParams);
    const categoryId = searchParams.get("categoryId") || undefined;

    const result = await listAdminItemsFromDb({ page, pageSize, search, categoryId });
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const body = await parseJsonRequest(request);
    const payload = validateItemCreate(body);
    const item = await createItemInDb(payload);

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

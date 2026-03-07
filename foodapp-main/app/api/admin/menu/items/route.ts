import { NextResponse } from "next/server";
import { ROLES } from "@/lib/auth/config.ts";
import { getSessionOrThrow, parseJsonRequest, toErrorResponse } from "@/lib/auth/http.ts";
import { createItemUseCase, listAdminItemsUseCase } from "@/lib/menu/use-cases.ts";
import { parseListQuery, validateItemCreate } from "@/lib/menu/validation.ts";

export async function GET(request: Request) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const { searchParams } = new URL(request.url);
    const { page, pageSize, search } = parseListQuery(searchParams);
    const categoryId = searchParams.get("categoryId") || undefined;

    const result = await listAdminItemsUseCase({ page, pageSize, search, categoryId });
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
    const item = await createItemUseCase(payload);

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

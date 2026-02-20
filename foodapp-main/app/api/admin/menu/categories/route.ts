import { NextResponse } from "next/server";
import { ROLES } from "@/lib/auth/config.mjs";
import { getSessionOrThrow, parseJsonRequest, toErrorResponse } from "@/lib/auth/http.mjs";
import {
  createCategoryInDb,
  listAdminCategoriesFromDb,
} from "@/lib/menu/drizzle-menu";
import { parseListQuery, validateCategoryCreate } from "@/lib/menu/validation.mjs";

export async function GET(request: Request) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const { searchParams } = new URL(request.url);
    const { page, pageSize, search } = parseListQuery(searchParams);
    const result = await listAdminCategoriesFromDb({ page, pageSize, search });

    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const body = await parseJsonRequest(request);
    const payload = validateCategoryCreate(body);
    const category = await createCategoryInDb(payload);

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

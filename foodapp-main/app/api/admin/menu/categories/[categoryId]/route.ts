import { NextResponse } from "next/server";
import { ROLES } from "@/lib/auth/config.mjs";
import { getSessionOrThrow, parseJsonRequest, toErrorResponse } from "@/lib/auth/http.mjs";
import { deleteCategoryInDb, updateCategoryInDb } from "@/lib/menu/drizzle-menu";
import { validateCategoryUpdate } from "@/lib/menu/validation.mjs";

type CategoryRouteProps = {
  params: Promise<{ categoryId: string }>;
};

export async function PATCH(request: Request, { params }: CategoryRouteProps) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const { categoryId } = await params;
    const body = await parseJsonRequest(request);
    const patch = validateCategoryUpdate(body);
    const category = await updateCategoryInDb(categoryId, patch);

    return NextResponse.json({ category });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: CategoryRouteProps) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const { categoryId } = await params;
    await deleteCategoryInDb(categoryId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

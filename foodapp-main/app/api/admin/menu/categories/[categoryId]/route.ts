import { NextResponse } from "next/server";
import { ROLES } from "@/lib/auth/config.ts";
import { getSessionOrThrow, parseJsonRequest, toErrorResponse } from "@/lib/auth/http.ts";
import { deleteCategoryUseCase, updateCategoryUseCase } from "@/lib/menu/use-cases.ts";
import { validateCategoryUpdate } from "@/lib/menu/validation.ts";

type CategoryRouteProps = {
  params: Promise<{ categoryId: string }>;
};

export async function PATCH(request: Request, { params }: CategoryRouteProps) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const { categoryId } = await params;
    const body = await parseJsonRequest(request);
    const patch = validateCategoryUpdate(body);
    const category = await updateCategoryUseCase(categoryId, patch);

    return NextResponse.json({ category });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: CategoryRouteProps) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const { categoryId } = await params;
    await deleteCategoryUseCase(categoryId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

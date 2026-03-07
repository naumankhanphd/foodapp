import { NextResponse } from "next/server";
import { ROLES } from "@/lib/auth/config.ts";
import { getSessionOrThrow, parseJsonRequest, toErrorResponse } from "@/lib/auth/http.ts";
import { deleteModifierOptionUseCase, updateModifierOptionUseCase } from "@/lib/menu/use-cases.ts";
import { validateModifierOptionUpdate } from "@/lib/menu/validation.ts";

type OptionRouteProps = {
  params: Promise<{ optionId: string }>;
};

export async function PATCH(request: Request, { params }: OptionRouteProps) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const { optionId } = await params;
    const body = await parseJsonRequest(request);
    const patch = validateModifierOptionUpdate(body);
    const option = await updateModifierOptionUseCase(optionId, patch);

    return NextResponse.json({ option });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: OptionRouteProps) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const { optionId } = await params;
    await deleteModifierOptionUseCase(optionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

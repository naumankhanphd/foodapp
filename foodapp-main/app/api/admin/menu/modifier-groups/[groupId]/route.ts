import { NextResponse } from "next/server";
import { ROLES } from "@/lib/auth/config.ts";
import { getSessionOrThrow, parseJsonRequest, toErrorResponse } from "@/lib/auth/http.ts";
import { deleteModifierGroupUseCase, updateModifierGroupUseCase } from "@/lib/menu/use-cases.ts";
import { validateModifierGroupUpdate } from "@/lib/menu/validation.ts";

type GroupRouteProps = {
  params: Promise<{ groupId: string }>;
};

export async function PATCH(request: Request, { params }: GroupRouteProps) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const { groupId } = await params;
    const body = await parseJsonRequest(request);
    const patch = validateModifierGroupUpdate(body);
    const group = await updateModifierGroupUseCase(groupId, patch);

    return NextResponse.json({ group });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: GroupRouteProps) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const { groupId } = await params;
    await deleteModifierGroupUseCase(groupId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

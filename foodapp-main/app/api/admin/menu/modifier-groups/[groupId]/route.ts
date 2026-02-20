import { NextResponse } from "next/server";
import { ROLES } from "@/lib/auth/config.mjs";
import { getSessionOrThrow, parseJsonRequest, toErrorResponse } from "@/lib/auth/http.mjs";
import { deleteModifierGroupInDb, updateModifierGroupInDb } from "@/lib/menu/drizzle-menu";
import { validateModifierGroupUpdate } from "@/lib/menu/validation.mjs";

type GroupRouteProps = {
  params: Promise<{ groupId: string }>;
};

export async function PATCH(request: Request, { params }: GroupRouteProps) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const { groupId } = await params;
    const body = await parseJsonRequest(request);
    const patch = validateModifierGroupUpdate(body);
    const group = await updateModifierGroupInDb(groupId, patch);

    return NextResponse.json({ group });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: GroupRouteProps) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const { groupId } = await params;
    await deleteModifierGroupInDb(groupId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

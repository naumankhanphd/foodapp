import { NextResponse } from "next/server";
import { ROLES } from "@/lib/auth/config.mjs";
import { getSessionOrThrow, parseJsonRequest, toErrorResponse } from "@/lib/auth/http.mjs";
import { deleteModifierOptionInDb, updateModifierOptionInDb } from "@/lib/menu/drizzle-menu";
import { validateModifierOptionUpdate } from "@/lib/menu/validation.mjs";

type OptionRouteProps = {
  params: Promise<{ optionId: string }>;
};

export async function PATCH(request: Request, { params }: OptionRouteProps) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const { optionId } = await params;
    const body = await parseJsonRequest(request);
    const patch = validateModifierOptionUpdate(body);
    const option = await updateModifierOptionInDb(optionId, patch);

    return NextResponse.json({ option });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: OptionRouteProps) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const { optionId } = await params;
    await deleteModifierOptionInDb(optionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

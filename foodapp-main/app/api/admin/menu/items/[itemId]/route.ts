import { NextResponse } from "next/server";
import { ROLES } from "@/lib/auth/config.ts";
import { getSessionOrThrow, parseJsonRequest, toErrorResponse } from "@/lib/auth/http.ts";
import { deleteItemInDb, getAdminItemDetailFromDb, updateItemInDb } from "@/lib/menu/drizzle-menu";
import { validateItemUpdate } from "@/lib/menu/validation.ts";

type ItemRouteProps = {
  params: Promise<{ itemId: string }>;
};

export async function GET(request: Request, { params }: ItemRouteProps) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const { itemId } = await params;
    const item = await getAdminItemDetailFromDb(itemId);

    return NextResponse.json({ item });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: ItemRouteProps) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const { itemId } = await params;
    const body = await parseJsonRequest(request);
    const patch = validateItemUpdate(body);
    const item = await updateItemInDb(itemId, patch);

    return NextResponse.json({ item });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: ItemRouteProps) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const { itemId } = await params;
    await deleteItemInDb(itemId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

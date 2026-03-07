import { NextResponse } from "next/server";
import { ROLES } from "@/lib/auth/config.ts";
import { getSessionOrThrow, parseJsonRequest, toErrorResponse } from "@/lib/auth/http.ts";
import { createModifierGroupUseCase } from "@/lib/menu/use-cases.ts";
import { validateModifierGroupCreate } from "@/lib/menu/validation.ts";

type GroupRouteProps = {
  params: Promise<{ itemId: string }>;
};

export async function POST(request: Request, { params }: GroupRouteProps) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const { itemId } = await params;
    const body = await parseJsonRequest(request);
    const payload = validateModifierGroupCreate(body);
    const group = await createModifierGroupUseCase(itemId, payload);

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

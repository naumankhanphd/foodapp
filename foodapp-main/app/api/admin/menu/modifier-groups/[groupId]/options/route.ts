import { NextResponse } from "next/server";
import { ROLES } from "@/lib/auth/config.ts";
import { getSessionOrThrow, parseJsonRequest, toErrorResponse } from "@/lib/auth/http.ts";
import { createModifierOptionUseCase } from "@/lib/menu/use-cases.ts";
import { validateModifierOptionCreate } from "@/lib/menu/validation.ts";

type OptionCreateProps = {
  params: Promise<{ groupId: string }>;
};

export async function POST(request: Request, { params }: OptionCreateProps) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });

    const { groupId } = await params;
    const body = await parseJsonRequest(request);
    const payload = validateModifierOptionCreate(body);
    const option = await createModifierOptionUseCase(groupId, payload);

    return NextResponse.json({ option }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

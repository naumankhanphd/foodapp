import { NextResponse } from "next/server";
import { getPublicItemDetailUseCase } from "@/lib/menu/use-cases.ts";
import { toErrorResponse } from "@/lib/auth/http.ts";

type ItemRouteProps = {
  params: Promise<{ itemId: string }>;
};

export async function GET(_: Request, { params }: ItemRouteProps) {
  try {
    const { itemId } = await params;
    const item = await getPublicItemDetailUseCase(itemId);
    return NextResponse.json({ item });
  } catch (error) {
    return toErrorResponse(error);
  }
}

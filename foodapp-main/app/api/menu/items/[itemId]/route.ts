import { NextResponse } from "next/server";
import { getPublicItemDetailFromDb } from "@/lib/menu/drizzle-menu";
import { toErrorResponse } from "@/lib/auth/http.mjs";

type ItemRouteProps = {
  params: Promise<{ itemId: string }>;
};

export async function GET(_: Request, { params }: ItemRouteProps) {
  try {
    const { itemId } = await params;
    const item = await getPublicItemDetailFromDb(itemId);
    return NextResponse.json({ item });
  } catch (error) {
    return toErrorResponse(error);
  }
}

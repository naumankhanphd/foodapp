import { NextResponse } from "next/server";
import { queueOrders } from "@/lib/mock-data";
import { getSessionOrThrow, toErrorResponse } from "@/lib/auth/http.mjs";
import { ROLES } from "@/lib/auth/config.mjs";

export async function GET(request: Request) {
  try {
    getSessionOrThrow(request, { roles: [ROLES.ADMIN] });
    return NextResponse.json({
      queue: queueOrders,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

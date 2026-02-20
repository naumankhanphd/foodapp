import { NextResponse } from "next/server";
import { queueOrders } from "@/lib/mock-data";
import { getSessionOrThrow, toErrorResponse } from "@/lib/auth/http.mjs";
import { ROLES } from "@/lib/auth/config.mjs";

type OrderRouteProps = {
  params: Promise<{ orderId: string }>;
};

export async function GET(_: Request, { params }: OrderRouteProps) {
  try {
    getSessionOrThrow(_, { roles: [ROLES.CUSTOMER, ROLES.ADMIN] });
    const { orderId } = await params;
    const order = queueOrders.find((item) => item.id === orderId);

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    return toErrorResponse(error);
  }
}

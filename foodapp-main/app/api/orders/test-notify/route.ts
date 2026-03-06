import { emitNewOrder } from "@/lib/notifications/order-emitter";

export const runtime = "nodejs";

const ORDER_TYPES = ["DELIVERY", "DINE_IN", "PICKUP"] as const;

export async function POST() {
  const id = `ORD-${1200 + Math.floor(Math.random() * 800)}`;
  const orderType = ORDER_TYPES[Math.floor(Math.random() * ORDER_TYPES.length)];
  const total = parseFloat((10 + Math.random() * 60).toFixed(2));

  emitNewOrder({ id, orderType, total });

  return Response.json({ ok: true, id, orderType, total });
}

import { subscribeNewOrder } from "@/lib/notifications/order-emitter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;

  function cleanup() {
    if (keepaliveTimer) { clearInterval(keepaliveTimer); keepaliveTimer = null; }
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  }

  const stream = new ReadableStream({
    start(controller) {
      // Confirm connection
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));

      // Keep-alive ping every 25 s to prevent proxy/browser timeout
      keepaliveTimer = setInterval(() => {
        try { controller.enqueue(encoder.encode(": keepalive\n\n")); }
        catch { cleanup(); }
      }, 25_000);

      // Forward new-order events to this SSE client
      unsubscribe = subscribeNewOrder((payload) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "new-order", ...payload })}\n\n`),
          );
        } catch { cleanup(); }
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

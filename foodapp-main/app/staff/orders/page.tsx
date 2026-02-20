import { queueOrders } from "@/lib/mock-data";

export default function StaffOrdersPage() {
  return (
    <section className="panel p-4 sm:p-6">
      <h2 className="text-2xl">Live Order Queue</h2>
      <p className="mt-2 text-sm">Status update controls and notifications integrate here.</p>

      <div className="mt-4 grid gap-3">
        {queueOrders.map((order) => (
          <article
            key={order.id}
            className="rounded-xl border border-[var(--line)] bg-white p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg">{order.id}</h3>
              <p className="text-xs uppercase tracking-wide">{order.orderType}</p>
            </div>
            <p className="mt-1 text-sm">Status: {order.status.replaceAll("_", " ")}</p>
            <p className="text-sm">ETA: {order.etaMinutes} min</p>
            <p className="text-sm font-semibold">Total: ${order.total.toFixed(2)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}


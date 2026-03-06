"use client";

import { useMemo, useState } from "react";
import { queueOrders } from "@/lib/mock-data";

type QueueOrder = (typeof queueOrders)[number];

const statusTone: Record<QueueOrder["status"], { pill: string; rail: string }> = {
  ACCEPTED: {
    pill: "bg-[#f7f2ff] text-[#3b2a67]",
    rail: "bg-[#7c5bb8]",
  },
  PREPARING: {
    pill: "bg-[#fff2e8] text-[#8a4b1a]",
    rail: "bg-[#e8863a]",
  },
  READY: {
    pill: "bg-[#eaf8ff] text-[#1c4d6b]",
    rail: "bg-[#2ea7d3]",
  },
  OUT_FOR_DELIVERY: {
    pill: "bg-[#eef7ef] text-[#1f5f2a]",
    rail: "bg-[#2f9b52]",
  },
};

function formatEuro(value: number) {
  return `\u20AC${value.toFixed(2).replace(".", ",")}`;
}

function prettifyToken(value: string) {
  return value.replaceAll("_", " ");
}

export default function StaffDashboardPage() {
  const activeOrders = queueOrders.length;
  const preparingCount = queueOrders.filter((o) => o.status === "PREPARING").length;
  const readyCount = queueOrders.filter((o) => o.status === "READY").length;
  const revenueTotal = queueOrders.reduce((sum, o) => sum + o.total, 0);
  const avgEtaMinutes =
    queueOrders.length > 0
      ? Math.round(queueOrders.reduce((sum, o) => sum + o.etaMinutes, 0) / queueOrders.length)
      : 0;

  const [selectedOrderId, setSelectedOrderId] = useState<string>(() => queueOrders[0]?.id ?? "");
  const selectedOrder = useMemo(
    () => queueOrders.find((o) => o.id === selectedOrderId) ?? queueOrders[0] ?? null,
    [selectedOrderId],
  );

  const [testPending, setTestPending] = useState(false);
  async function fireTestAlarm() {
    if (testPending) return;
    setTestPending(true);
    try { await fetch("/api/orders/test-notify", { method: "POST" }); }
    finally { setTestPending(false); }
  }

  const statCards = [
    { label: "Queue",      value: `${activeOrders}`,         helper: "active orders",  tone: "bg-[#eef3ff]" },
    { label: "Preparing",  value: `${preparingCount}`,       helper: "in kitchen",     tone: "bg-[#fff2e8]" },
    { label: "Ready",      value: `${readyCount}`,           helper: "for pickup",     tone: "bg-[#eef7ef]" },
    { label: "Revenue",    value: formatEuro(revenueTotal),  helper: "in queue",       tone: "bg-[#fff7e8]" },
    { label: "Avg ETA",    value: `${avgEtaMinutes} min`,    helper: "kitchen avg",    tone: "bg-[#f6f1ff]" },
  ];

  return (
    <section className="grid gap-4">

      {/* ── Row 1: Operations Live ── horizontal flex */}
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-0.5 lg:flex-wrap lg:overflow-visible">
        {statCards.map((card) => (
          <article
            key={card.label}
            className={`min-w-[42%] flex-shrink-0 snap-start rounded-[16px] border-2 border-[#2d1d13] px-4 py-3 shadow-[3px_3px_0_0_#2d1d13] sm:min-w-[30%] lg:min-w-0 lg:flex-1 ${card.tone}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#514a66]">{card.label}</p>
            <p className="mt-1 text-2xl font-black text-[#1f1f1f]">{card.value}</p>
            <p className="text-[11px] font-semibold text-[#3d3550]">{card.helper}</p>
          </article>
        ))}
      </div>

      {/* ── Test alarm button (dev / staff testing) ── */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={fireTestAlarm}
          disabled={testPending}
          className="rounded-xl border-2 border-[#2d1d13] bg-[#fff4dd] px-4 py-2 text-xs font-bold text-[#2d1d13] shadow-[2px_2px_0_0_#2d1d13] transition hover:bg-[#ffe4b5] disabled:opacity-50"
        >
          {testPending ? "Sending…" : "Test Alarm"}
        </button>
      </div>

      {/* ── Row 2: Queue (70) + Order Details (30) ── */}
      <div className="grid gap-4 lg:grid-cols-[70fr_30fr]">

        {/* Queue */}
        <article className="rounded-[20px] border-[3px] border-[#2d1d13] bg-[linear-gradient(165deg,#f7f2ff_0%,#ece7ff_54%,#e9f5ff_100%)] p-5 shadow-[5px_5px_0_0_#2d1d13]">
          <div className="flex items-center justify-between gap-3 border-b border-[#b9add8] pb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#514a66]">Queue</p>
              <h2 className="mt-0.5 text-2xl font-black text-[#1f1f1f]">Incoming Orders</h2>
            </div>
          </div>

          <div className="mt-4 grid min-h-[33rem] max-h-[33rem] gap-3 overflow-y-auto pr-1 content-start">
            {queueOrders.length > 0 ? (
              queueOrders.map((order) => {
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`relative w-full rounded-[14px] bg-[#fffdf8] p-4 pl-5 text-left transition ${
                      isSelected
                        ? "border-[3px] border-orange-500 shadow-[3px_3px_0_0_#f97316]"
                        : "border-2 border-[#2d1d13] shadow-[3px_3px_0_0_#2d1d13]"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute inset-y-3 left-2 w-1 rounded-full ${statusTone[order.status].rail}`}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-lg font-black text-[#1f1f1f]">{order.id}</h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${statusTone[order.status].pill}`}
                      >
                        {prettifyToken(order.status)}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1 text-sm text-[#3d3550] sm:grid-cols-3 sm:gap-2">
                      <p><span className="font-semibold text-[#1f1f1f]">Type:</span> {prettifyToken(order.orderType)}</p>
                      <p><span className="font-semibold text-[#1f1f1f]">ETA:</span> {order.etaMinutes} min</p>
                      <p><span className="font-semibold text-[#1f1f1f]">Total:</span> {formatEuro(order.total)}</p>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="rounded-[14px] border-2 border-[#2d1d13] bg-[#fffdf8] p-4 text-sm text-[#4a4260]">
                No active orders in queue.
              </p>
            )}
          </div>
        </article>

        {/* Order Details */}
        <article className="rounded-[20px] border-[3px] border-[#2d1d13] bg-[linear-gradient(165deg,#f6f1ff_0%,#ece7ff_50%,#e8f4ff_100%)] p-5 shadow-[4px_4px_0_0_#2d1d13]">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#514a66]">Order Details</p>
          <h2 className="mt-0.5 text-2xl font-black text-[#1f1f1f]">
            {selectedOrder ? selectedOrder.id : "—"}
          </h2>

          {selectedOrder ? (
            <div className="mt-4 grid gap-3">
              <span
                className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] ${statusTone[selectedOrder.status].pill}`}
              >
                {prettifyToken(selectedOrder.status)}
              </span>

              <dl className="grid gap-3 rounded-xl border-2 border-[#2d1d13] bg-[#fffdf8] p-4 text-sm shadow-[2px_2px_0_0_#2d1d13]">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#5b516f]">Type</dt>
                  <dd className="mt-0.5 font-semibold text-[#1f1f1f]">{prettifyToken(selectedOrder.orderType)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#5b516f]">ETA</dt>
                  <dd className="mt-0.5 font-semibold text-[#1f1f1f]">{selectedOrder.etaMinutes} min</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#5b516f]">Total</dt>
                  <dd className="mt-0.5 font-semibold text-[#1f1f1f]">{formatEuro(selectedOrder.total)}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border-2 border-[#2d1d13] bg-[#fffdf8] p-4 text-sm text-[#4a4260]">
              Select an order from the queue.
            </p>
          )}
        </article>

      </div>
    </section>
  );
}

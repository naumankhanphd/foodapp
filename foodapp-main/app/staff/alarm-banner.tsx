"use client";

import { useOrderAlarm } from "@/lib/notifications/use-order-alarm";

export function AlarmController() {
  const { alarmOrder, secondsLeft, dismiss } = useOrderAlarm();

  if (!alarmOrder) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[200] flex items-center justify-between gap-4 bg-red-600 px-5 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      {/* Flashing left bar */}
      <span className="absolute left-0 inset-y-0 w-1.5 animate-pulse bg-yellow-300" />

      <div className="flex items-center gap-4 pl-3">
        <span className="text-3xl animate-bounce select-none">🔔</span>
        <div>
          <p className="text-lg font-black leading-tight text-white tracking-wide">
            New Order — {alarmOrder.id}
          </p>
          <p className="text-sm text-red-100">
            {alarmOrder.orderType.replace(/_/g, " ")} &nbsp;·&nbsp; €{alarmOrder.total.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 pr-1">
        {/* Countdown ring */}
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border-[3px] border-yellow-300 bg-red-700">
          <span className="text-sm font-black tabular-nums text-yellow-300">{secondsLeft}</span>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="rounded-xl border-[3px] border-white bg-white px-5 py-2 text-sm font-black text-red-600 shadow-[2px_2px_0_0_rgba(0,0,0,0.2)] transition hover:bg-red-50 active:scale-95"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

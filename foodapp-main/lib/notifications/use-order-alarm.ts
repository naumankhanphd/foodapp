"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AlarmOrder = {
  id: string;
  orderType: string;
  total: number;
};

const ALARM_DURATION_S = 60;

export function useOrderAlarm() {
  const [alarmOrder, setAlarmOrder] = useState<AlarmOrder | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(ALARM_DURATION_S);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Pre-warm AudioContext on first user interaction (browser autoplay policy) ──
  useEffect(() => {
    const warm = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
    };
    document.addEventListener("click", warm, { once: true });
    document.addEventListener("keydown", warm, { once: true });
    return () => {
      document.removeEventListener("click", warm);
      document.removeEventListener("keydown", warm);
    };
  }, []);

  // ── Request browser notification permission on mount ──
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const stopAlarm = useCallback(() => {
    // Stop audio
    try {
      if (gainRef.current && audioCtxRef.current) {
        gainRef.current.gain.cancelScheduledValues(audioCtxRef.current.currentTime);
        gainRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
      }
      oscRef.current?.stop();
    } catch { /* already stopped */ }
    gainRef.current = null;
    oscRef.current = null;

    // Clear timers
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null; }

    setAlarmOrder(null);
    setSecondsLeft(ALARM_DURATION_S);
  }, []);

  const startAlarm = useCallback((order: AlarmOrder) => {
    stopAlarm();
    setAlarmOrder(order);
    setSecondsLeft(ALARM_DURATION_S);

    // ── Web Audio beeping alarm ──
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.connect(ctx.destination);

      // Schedule beep pattern: 0.35 s ON, 0.25 s OFF, repeat for 60 s
      const now = ctx.currentTime;
      const beepOn = 0.35;
      const beepOff = 0.25;
      const cycle = beepOn + beepOff;
      const cycles = Math.ceil(ALARM_DURATION_S / cycle);
      for (let i = 0; i < cycles; i++) {
        const t = now + i * cycle;
        gain.gain.setValueAtTime(0.85, t);           // beep on
        gain.gain.setValueAtTime(0, t + beepOn);     // beep off
      }

      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(880, now);       // A5 — loud & attention-grabbing
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + ALARM_DURATION_S);

      gainRef.current = gain;
      oscRef.current = osc;
    } catch (err) {
      console.warn("[OrderAlarm] Web Audio failed:", err);
    }

    // ── Browser notification (shows even when tab is in background) ──
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("New Order Received!", {
          body: `${order.id} · ${order.orderType.replace(/_/g, " ")} · €${order.total.toFixed(2)}`,
          icon: "/favicon.ico",
          requireInteraction: true,
        });
      } catch { /* Safari may block */ }
    }

    // ── 60-second countdown ──
    let s = ALARM_DURATION_S;
    countdownRef.current = setInterval(() => {
      s -= 1;
      setSecondsLeft(s);
      if (s <= 0) stopAlarm();
    }, 1_000);

    autoStopRef.current = setTimeout(stopAlarm, ALARM_DURATION_S * 1_000);
  }, [stopAlarm]);

  // ── SSE connection ──
  useEffect(() => {
    let es: EventSource;

    function connect() {
      es = new EventSource("/api/orders/stream");

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data as string);
          if (data.type === "new-order") {
            startAlarm({ id: data.id, orderType: data.orderType, total: data.total });
          }
        } catch { /* malformed */ }
      };

      es.onerror = () => {
        es.close();
        // Reconnect after 3 s
        setTimeout(connect, 3_000);
      };
    }

    connect();

    return () => {
      es?.close();
      stopAlarm();
    };
  }, [startAlarm, stopAlarm]);

  return { alarmOrder, secondsLeft, dismiss: stopAlarm };
}

import { EventEmitter } from "events";

// Survive Next.js hot reloads in dev by attaching to global
const g = global as unknown as { __orderEmitter?: EventEmitter };
if (!g.__orderEmitter) {
  g.__orderEmitter = new EventEmitter();
  g.__orderEmitter.setMaxListeners(200);
}
const emitter = g.__orderEmitter;

export type NewOrderPayload = {
  id: string;
  orderType: string;
  total: number;
};

export function emitNewOrder(payload: NewOrderPayload): void {
  emitter.emit("new-order", payload);
}

export function subscribeNewOrder(listener: (p: NewOrderPayload) => void): () => void {
  emitter.on("new-order", listener);
  return () => emitter.off("new-order", listener);
}

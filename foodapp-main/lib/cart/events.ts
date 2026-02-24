export const CART_UPDATED_EVENT = "foodapp:cart-updated";

export function dispatchCartUpdated() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}


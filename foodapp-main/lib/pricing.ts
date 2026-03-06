export function computeCheckoutTotal({
  subtotal,
  discount = 0,
  tax = 0,
  deliveryFee = 0,
}: {
  subtotal: number;
  discount?: number;
  tax?: number;
  deliveryFee?: number;
}): number {
  const total = subtotal - discount + tax + deliveryFee;
  return Number(total.toFixed(2));
}

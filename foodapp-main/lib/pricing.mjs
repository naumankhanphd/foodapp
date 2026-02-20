export function computeCheckoutTotal({
  subtotal,
  discount = 0,
  tax = 0,
  deliveryFee = 0,
}) {
  const total = subtotal - discount + tax + deliveryFee;
  return Number(total.toFixed(2));
}


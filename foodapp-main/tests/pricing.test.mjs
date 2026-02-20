import test from "node:test";
import assert from "node:assert/strict";
import { computeCheckoutTotal } from "../lib/pricing.mjs";

test("computeCheckoutTotal includes all pricing fields", () => {
  const total = computeCheckoutTotal({
    subtotal: 23.9,
    discount: 2,
    tax: 1.72,
    deliveryFee: 3.5,
  });

  assert.equal(total, 27.12);
});

test("computeCheckoutTotal rounds to 2 decimals", () => {
  const total = computeCheckoutTotal({
    subtotal: 10.005,
    discount: 0,
    tax: 0,
    deliveryFee: 0,
  });

  assert.equal(total, 10.01);
});


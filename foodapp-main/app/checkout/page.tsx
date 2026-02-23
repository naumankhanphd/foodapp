"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CHECKOUT_RESTRICTION_POLICY } from "@/lib/auth/config.mjs";

type OrderType = "DINE_IN" | "DELIVERY" | "PICKUP";
type PaymentMethod = "CARD" | "GOOGLE_PAY" | "APPLE_PAY" | "PAYPAL" | "CASH";

type CheckoutSummary = {
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  total: number;
  taxRate: number;
  taxIncludedInMenuPrices: boolean;
};

type CheckoutResponse = {
  checkout: {
    orderType: OrderType;
    paymentMethod: PaymentMethod;
    minimumOrderTotal: number;
    summary: CheckoutSummary;
  };
};

const ORDER_TYPES: Array<{ value: OrderType; label: string }> = [
  { value: "DINE_IN", label: "Dine-in" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "PICKUP", label: "Self pickup" },
];

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "CARD", label: "Card" },
  { value: "GOOGLE_PAY", label: "Google Pay" },
  { value: "APPLE_PAY", label: "Apple Pay" },
  { value: "PAYPAL", label: "PayPal" },
  { value: "CASH", label: "Cash" },
];

function formatEuro(value: number) {
  return `€${Number(value).toFixed(2).replace(".", ",")}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [orderType, setOrderType] = useState<OrderType>("DELIVERY");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CARD");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressPostalCode, setAddressPostalCode] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [preview, setPreview] = useState<CheckoutResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const requiresDeliveryAddress = orderType === "DELIVERY";

  function buildPayload() {
    return {
      orderType,
      paymentMethod,
      deliveryAddress: requiresDeliveryAddress
        ? {
            line1: addressLine1,
            city: addressCity,
            postalCode: addressPostalCode,
            notes: deliveryNotes,
          }
        : undefined,
    };
  }

  async function refreshPreview() {
    const response = await fetch("/api/checkout/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });

    const payload = (await response.json().catch(() => ({}))) as CheckoutResponse & {
      message?: string;
    };

    if (!response.ok) {
      throw new Error(payload.message || "Unable to calculate checkout summary.");
    }

    setPreview(payload);
  }

  useEffect(() => {
    setPending(true);
    setError("");
    void refreshPreview()
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Unexpected error.");
      })
      .finally(() => {
        setPending(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = preview?.checkout.summary;
  const canPlaceOrder = useMemo(() => {
    if (!summary || pending) return false;
    if (!requiresDeliveryAddress) return true;
    return Boolean(addressLine1.trim() && addressCity.trim());
  }, [addressCity, addressLine1, pending, requiresDeliveryAddress, summary]);

  async function handleRecalculate() {
    setPending(true);
    setMessage("");
    setError("");
    try {
      await refreshPreview();
      setMessage("Summary updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error.");
    } finally {
      setPending(false);
    }
  }

  async function handlePlaceOrder() {
    setPending(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/checkout/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        order?: { id: string };
      };

      if (!response.ok || !payload.order?.id) {
        throw new Error(payload.message || "Unable to place order.");
      }

      router.push(`/orders/${payload.order.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error.");
      setPending(false);
    }
  }

  return (
    <main className="py-6 sm:py-10">
      <div className="shell grid gap-5">
        <header className="panel p-5 sm:p-7">
          <p className="badge">Customer</p>
          <h1 className="mt-3 text-3xl sm:text-4xl">Checkout</h1>
          <p className="mt-2 text-sm sm:text-base">
            Choose order type, payment method, and delivery details. Totals include discount, tax, and delivery fee.
          </p>
          <p className="mt-3 rounded-lg border border-[var(--line)] bg-white p-3 text-xs">
            Guest policy: {CHECKOUT_RESTRICTION_POLICY}
          </p>
          {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        </header>

        <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <article className="panel p-4 sm:p-6">
            <h2 className="text-xl">Order Details</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {ORDER_TYPES.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => setOrderType(entry.value)}
                  className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
                    orderType === entry.value
                      ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                      : "border-[var(--line)] bg-white"
                  }`}
                  disabled={pending}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            <h3 className="mt-6 text-lg">Payment Method</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {PAYMENT_METHODS.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => setPaymentMethod(entry.value)}
                  className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
                    paymentMethod === entry.value
                      ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                      : "border-[var(--line)] bg-white"
                  }`}
                  disabled={pending}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            {requiresDeliveryAddress ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Delivery Address Line 1
                  </span>
                  <input
                    className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                    value={addressLine1}
                    onChange={(event) => setAddressLine1(event.target.value)}
                    required
                  />
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    City
                  </span>
                  <input
                    className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                    value={addressCity}
                    onChange={(event) => setAddressCity(event.target.value)}
                    required
                  />
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Postal Code
                  </span>
                  <input
                    className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                    value={addressPostalCode}
                    onChange={(event) => setAddressPostalCode(event.target.value)}
                  />
                </label>

                <label className="grid gap-1 text-sm sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Delivery Notes
                  </span>
                  <textarea
                    className="min-h-20 rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                    maxLength={280}
                    value={deliveryNotes}
                    onChange={(event) => setDeliveryNotes(event.target.value)}
                    placeholder="Gate code, call on arrival, etc."
                  />
                </label>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
                onClick={handleRecalculate}
                disabled={pending}
              >
                {pending ? "Calculating..." : "Recalculate summary"}
              </button>
              <Link
                href="/cart"
                className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
              >
                Back to cart
              </Link>
            </div>
          </article>

          <aside className="panel p-4 sm:p-6">
            <h2 className="text-xl">Summary</h2>
            {!summary ? <p className="mt-3 text-sm">No checkout summary yet.</p> : null}

            {summary ? (
              <div className="mt-3 space-y-2 text-sm">
                <p className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatEuro(summary.subtotal)}</span>
                </p>
                <p className="flex justify-between">
                  <span>Discount</span>
                  <span>-{formatEuro(summary.discount)}</span>
                </p>
                <p className="flex justify-between">
                  <span>{summary.taxIncludedInMenuPrices ? "Tax / VAT (included)" : "Tax / VAT"}</span>
                  <span>{formatEuro(summary.tax)}</span>
                </p>
                <p className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>{formatEuro(summary.deliveryFee)}</span>
                </p>
                <hr className="border-[var(--line)]" />
                <p className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>{formatEuro(summary.total)}</span>
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {summary.taxIncludedInMenuPrices
                    ? "Tax is included in menu prices."
                    : "Tax is not included in menu prices and is added above."}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Minimum order for this mode: {formatEuro(preview?.checkout.minimumOrderTotal || 0)}
                </p>
              </div>
            ) : null}

            <button
              type="button"
              className={`mt-4 block w-full rounded-xl px-5 py-3 text-center text-sm font-semibold ${
                canPlaceOrder
                  ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                  : "cursor-not-allowed border border-[var(--line)] bg-white text-[var(--muted)]"
              }`}
              disabled={!canPlaceOrder}
              onClick={handlePlaceOrder}
            >
              Place order
            </button>
          </aside>
        </section>
      </div>
    </main>
  );
}

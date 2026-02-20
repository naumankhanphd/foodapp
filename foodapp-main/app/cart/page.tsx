"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CartModifierOption = {
  id: string;
  name: string;
  priceDelta: number;
  isActive: boolean;
  selected: boolean;
};

type CartModifierGroup = {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  options: CartModifierOption[];
};

type CartItem = {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  specialInstructions: string;
  selectedOptionIds: string[];
  selectedModifiers: Array<{
    optionId: string;
    optionName: string;
    groupName: string;
    priceDelta: number;
  }>;
  modifierGroups: CartModifierGroup[];
  basePrice: number;
  modifierTotal: number;
  unitPrice: number;
  lineTotal: number;
  availability: "active" | "inactive";
  validationIssues: string[];
};

type CartPayload = {
  cart: {
    orderType: "DINE_IN" | "DELIVERY" | "PICKUP";
    itemCount: number;
    subtotal: number;
    hasValidationIssues: boolean;
    items: CartItem[];
  };
  config: {
    orderTypes: Array<"DINE_IN" | "DELIVERY" | "PICKUP">;
    taxIncludedInMenuPrices: boolean;
  };
};

type ItemDraft = {
  quantity: string;
  specialInstructions: string;
  selectedOptionIds: string[];
};

function labelOrderType(orderType: "DINE_IN" | "DELIVERY" | "PICKUP") {
  if (orderType === "DINE_IN") return "Dine-in";
  if (orderType === "PICKUP") return "Self pickup";
  return "Delivery";
}

export default function CartPage() {
  const [data, setData] = useState<CartPayload | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({});
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadCart() {
    const response = await fetch("/api/cart", {
      method: "GET",
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as CartPayload & {
      message?: string;
    };

    if (!response.ok) {
      throw new Error(payload.message || "Unable to load cart.");
    }

    setData(payload);
    setDrafts((previous) => {
      const next: Record<string, ItemDraft> = {};
      for (const item of payload.cart.items) {
        const previousDraft = previous[item.id];
        next[item.id] = previousDraft || {
          quantity: String(item.quantity),
          specialInstructions: item.specialInstructions || "",
          selectedOptionIds: [...item.selectedOptionIds],
        };
      }
      return next;
    });
  }

  useEffect(() => {
    setPending(true);
    setError("");
    void loadCart()
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Unexpected error.");
      })
      .finally(() => {
        setPending(false);
      });
  }, []);

  const cart = data?.cart;
  const config = data?.config;

  const canCheckout = useMemo(() => {
    if (!cart) return false;
    return cart.items.length > 0 && !cart.hasValidationIssues;
  }, [cart]);

  async function updateOrderType(orderType: "DINE_IN" | "DELIVERY" | "PICKUP") {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderType }),
      });
      const payload = (await response.json().catch(() => ({}))) as CartPayload & {
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to update cart.");
      }
      setData(payload);
      setMessage("Cart order type updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error.");
    } finally {
      setPending(false);
    }
  }

  function toggleDraftOption(item: CartItem, optionId: string) {
    const group = item.modifierGroups.find((entry) =>
      entry.options.some((option) => option.id === optionId),
    );
    if (!group) {
      return;
    }

    setDrafts((current) => {
      const existing = current[item.id] || {
        quantity: String(item.quantity),
        specialInstructions: item.specialInstructions || "",
        selectedOptionIds: [...item.selectedOptionIds],
      };

      if (existing.selectedOptionIds.includes(optionId)) {
        return {
          ...current,
          [item.id]: {
            ...existing,
            selectedOptionIds: existing.selectedOptionIds.filter((value) => value !== optionId),
          },
        };
      }

      const selectedInGroup = existing.selectedOptionIds.filter((selectedId) =>
        group.options.some((option) => option.id === selectedId),
      ).length;
      if (selectedInGroup >= group.maxSelect) {
        setError(`"${group.name}" allows max ${group.maxSelect} selection(s).`);
        return current;
      }

      return {
        ...current,
        [item.id]: {
          ...existing,
          selectedOptionIds: [...existing.selectedOptionIds, optionId],
        },
      };
    });
  }

  async function saveItem(item: CartItem) {
    const draft = drafts[item.id];
    if (!draft) return;

    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/cart/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: Number(draft.quantity),
          specialInstructions: draft.specialInstructions,
          selectedOptionIds: draft.selectedOptionIds,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to update cart item.");
      }

      await loadCart();
      setMessage("Cart item updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error.");
    } finally {
      setPending(false);
    }
  }

  async function deleteItem(itemId: string) {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to remove item.");
      }
      await loadCart();
      setMessage("Item removed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="py-6 sm:py-10">
      <div className="shell grid gap-5">
        <header className="panel p-5 sm:p-7">
          <p className="badge">Customer</p>
          <h1 className="mt-3 text-3xl sm:text-4xl">Cart</h1>
          <p className="mt-2 text-sm sm:text-base">
            Add/remove items, adjust quantity, choose modifiers, and set per-item instructions.
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Menu prices include VAT/tax.
          </p>
          {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        </header>

        <section className="panel p-4 sm:p-6">
          <h2 className="text-xl">Order Type</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {(config?.orderTypes || ["DINE_IN", "DELIVERY", "PICKUP"]).map((orderType) => (
              <button
                key={orderType}
                type="button"
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                  cart?.orderType === orderType
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                    : "border-[var(--line)] bg-white"
                }`}
                disabled={pending}
                onClick={() => updateOrderType(orderType)}
              >
                {labelOrderType(orderType)}
              </button>
            ))}
          </div>
        </section>

        <section className="panel p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl">Items</h2>
            <Link className="text-sm underline" href="/menu">
              Add more from menu
            </Link>
          </div>

          {!cart || pending ? <p className="mt-3 text-sm">Loading cart...</p> : null}

          {cart && cart.items.length === 0 ? (
            <div className="mt-4 rounded-lg border border-[var(--line)] bg-white p-4 text-sm">
              Cart is empty. Browse menu items to start checkout.
            </div>
          ) : null}

          <div className="mt-3 grid gap-4">
            {cart?.items.map((item) => {
              const draft = drafts[item.id] || {
                quantity: String(item.quantity),
                specialInstructions: item.specialInstructions || "",
                selectedOptionIds: [...item.selectedOptionIds],
              };

              return (
                <article key={item.id} className="rounded-xl border border-[var(--line)] bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg">{item.itemName}</h3>
                      <p className="text-xs text-[var(--muted)]">
                        ${item.unitPrice.toFixed(2)} each incl. VAT
                      </p>
                    </div>
                    <p className="text-sm font-semibold">${item.lineTotal.toFixed(2)}</p>
                  </div>

                  {item.validationIssues.length > 0 ? (
                    <p className="mt-2 text-xs text-red-700">{item.validationIssues.join(" ")}</p>
                  ) : null}

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Quantity
                      </span>
                      <input
                        className="rounded-lg border border-[var(--line)] px-3 py-2"
                        type="number"
                        min={1}
                        max={20}
                        value={draft.quantity}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [item.id]: {
                              ...draft,
                              quantity: event.target.value,
                            },
                          }))
                        }
                      />
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Special Instructions
                      </span>
                      <textarea
                        className="min-h-20 rounded-lg border border-[var(--line)] px-3 py-2"
                        maxLength={280}
                        value={draft.specialInstructions}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [item.id]: {
                              ...draft,
                              specialInstructions: event.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="mt-3 grid gap-2">
                    {item.modifierGroups.map((group) => (
                      <section key={group.id} className="rounded-lg border border-[var(--line)] p-3">
                        <h4 className="text-sm font-semibold">{group.name}</h4>
                        <p className="text-xs text-[var(--muted)]">
                          Select {Math.max(group.minSelect, group.isRequired ? 1 : 0)}-{group.maxSelect}
                        </p>
                        <div className="mt-2 grid gap-2">
                          {group.options.map((option) => (
                            <label key={option.id} className="flex items-center justify-between gap-2 text-sm">
                              <span>{option.name}</span>
                              <span className="flex items-center gap-3">
                                <span className="text-xs text-[var(--muted)]">
                                  +${option.priceDelta.toFixed(2)}
                                </span>
                                <input
                                  type="checkbox"
                                  checked={draft.selectedOptionIds.includes(option.id)}
                                  onChange={() => toggleDraftOption(item, option.id)}
                                />
                              </span>
                            </label>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold"
                      disabled={pending}
                      onClick={() => saveItem(item)}
                    >
                      Save changes
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700"
                      disabled={pending}
                      onClick={() => deleteItem(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="panel p-4 sm:p-6">
          <h2 className="text-xl">Summary</h2>
          <p className="mt-3 text-sm">
            Items: <strong>{cart?.itemCount || 0}</strong>
          </p>
          <p className="mt-1 text-sm">
            Subtotal: <strong>${(cart?.subtotal || 0).toFixed(2)}</strong>
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            VAT/tax is included in prices. Delivery fee is calculated at checkout based on order type.
          </p>
        </section>

        <div className="sticky bottom-3 sm:static">
          <Link
            href={canCheckout ? "/checkout" : "/cart"}
            className={`block rounded-xl px-5 py-3 text-center text-sm font-semibold ${
              canCheckout
                ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                : "cursor-not-allowed border border-[var(--line)] bg-white text-[var(--muted)]"
            }`}
            aria-disabled={!canCheckout}
          >
            {canCheckout ? "Proceed to checkout" : "Resolve cart issues before checkout"}
          </Link>
        </div>
      </div>
    </main>
  );
}

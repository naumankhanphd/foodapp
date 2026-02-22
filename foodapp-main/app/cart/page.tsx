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
  specialInstructions: string;
  selectedOptionIds: string[];
};

type CartSnapshot = CartPayload["cart"];

function recalculateCart(snapshot: CartSnapshot): CartSnapshot {
  const itemCount = snapshot.items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = snapshot.items.reduce((total, item) => total + item.lineTotal, 0);
  const hasValidationIssues = snapshot.items.some((item) => item.validationIssues.length > 0);

  return {
    ...snapshot,
    itemCount,
    subtotal,
    hasValidationIssues,
  };
}

function buildSelectedModifiers(item: CartItem, selectedOptionIds: string[]) {
  const selected = new Set(selectedOptionIds);
  const selectedModifiers: CartItem["selectedModifiers"] = [];

  for (const group of item.modifierGroups) {
    for (const option of group.options) {
      if (!selected.has(option.id)) {
        continue;
      }
      selectedModifiers.push({
        optionId: option.id,
        optionName: option.name,
        groupName: group.name,
        priceDelta: option.priceDelta,
      });
    }
  }

  return selectedModifiers;
}

function applyDraftToItem(item: CartItem, draft: ItemDraft): CartItem {
  const selectedOptionIds = [...draft.selectedOptionIds];
  const selectedModifiers = buildSelectedModifiers(item, selectedOptionIds);
  const modifierTotal = selectedModifiers.reduce((sum, entry) => sum + entry.priceDelta, 0);
  const unitPrice = item.basePrice + modifierTotal;
  const lineTotal = unitPrice * item.quantity;

  return {
    ...item,
    specialInstructions: draft.specialInstructions,
    selectedOptionIds,
    selectedModifiers,
    modifierTotal,
    unitPrice,
    lineTotal,
    modifierGroups: item.modifierGroups.map((group) => ({
      ...group,
      options: group.options.map((option) => ({
        ...option,
        selected: selectedOptionIds.includes(option.id),
      })),
    })),
  };
}

function labelOrderType(orderType: "DINE_IN" | "DELIVERY" | "PICKUP") {
  if (orderType === "DINE_IN") return "Dine-in";
  if (orderType === "PICKUP") return "Self pickup";
  return "Delivery";
}

export default function CartPage() {
  const [data, setData] = useState<CartPayload | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({});
  const [orderTypePending, setOrderTypePending] = useState(false);
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
        next[item.id] = {
          specialInstructions: previousDraft?.specialInstructions ?? (item.specialInstructions || ""),
          selectedOptionIds: previousDraft?.selectedOptionIds ?? [...item.selectedOptionIds],
        };
      }
      return next;
    });
  }

  useEffect(() => {
    setError("");
    void loadCart()
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Unexpected error.");
      });
  }, []);

  const cart = data?.cart;
  const config = data?.config;

  const canCheckout = useMemo(() => {
    if (!cart) return false;
    return cart.items.length > 0 && !cart.hasValidationIssues;
  }, [cart]);

  function applyServerCart(nextCart: CartSnapshot) {
    setData((current) => (current ? { ...current, cart: nextCart } : current));
    setDrafts(() => {
      const next: Record<string, ItemDraft> = {};
      for (const item of nextCart.items) {
        next[item.id] = {
          specialInstructions: item.specialInstructions ?? "",
          selectedOptionIds: [...item.selectedOptionIds],
        };
      }
      return next;
    });
  }

  async function updateOrderType(orderType: "DINE_IN" | "DELIVERY" | "PICKUP") {
    const previous = data;
    setOrderTypePending(true);
    setError("");
    if (previous) {
      setData({
        ...previous,
        cart: {
          ...previous.cart,
          orderType,
        },
      });
    }

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
    } catch (caught) {
      if (previous) {
        setData(previous);
      }
      setError(caught instanceof Error ? caught.message : "Unexpected error.");
    } finally {
      setOrderTypePending(false);
    }
  }

  async function toggleDraftOption(item: CartItem, optionId: string) {
    const group = item.modifierGroups.find((entry) =>
      entry.options.some((option) => option.id === optionId),
    );
    if (!group) {
      return;
    }

    const existing = drafts[item.id] || {
      specialInstructions: item.specialInstructions || "",
      selectedOptionIds: [...item.selectedOptionIds],
    };

    let nextSelectedOptionIds: string[];
    if (existing.selectedOptionIds.includes(optionId)) {
      nextSelectedOptionIds = existing.selectedOptionIds.filter((value) => value !== optionId);
    } else {
      const selectedInGroup = existing.selectedOptionIds.filter((selectedId) =>
        group.options.some((option) => option.id === selectedId),
      ).length;
      if (selectedInGroup >= group.maxSelect) {
        setError(`"${group.name}" allows max ${group.maxSelect} selection(s).`);
        return;
      }
      nextSelectedOptionIds = [...existing.selectedOptionIds, optionId];
    }

    const nextDraft: ItemDraft = {
      ...existing,
      selectedOptionIds: nextSelectedOptionIds,
    };

    setDrafts((current) => ({
      ...current,
      [item.id]: nextDraft,
    }));

    const saved = await saveItem(item, nextDraft);
    if (!saved) {
      setDrafts((current) => ({
        ...current,
        [item.id]: existing,
      }));
    }
  }

  async function saveItem(item: CartItem, draftOverride?: ItemDraft) {
    const draft = draftOverride || drafts[item.id];
    if (!draft) return false;

    const previous = data;
    setError("");
    if (previous) {
      const nextItems = previous.cart.items.map((entry) =>
        entry.id === item.id ? applyDraftToItem(entry, draft) : entry,
      );
      applyServerCart(
        recalculateCart({
          ...previous.cart,
          items: nextItems,
        }),
      );
    }

    try {
      const response = await fetch(`/api/cart/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialInstructions: draft.specialInstructions,
          selectedOptionIds: draft.selectedOptionIds,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to update cart item.");
      }

      const parsed = payload as { cart?: CartSnapshot };
      if (parsed.cart) {
        applyServerCart(parsed.cart);
      } else if (previous) {
        await loadCart();
      }
      return true;
    } catch (caught) {
      if (previous) {
        setData(previous);
      }
      setError(caught instanceof Error ? caught.message : "Unexpected error.");
      return false;
    } finally {
      // No per-item loading UI for optimistic interactions.
    }
  }

  async function deleteItem(itemId: string) {
    const previous = data;
    setError("");
    if (previous) {
      const nextItems = previous.cart.items.filter((entry) => entry.id !== itemId);
      applyServerCart(
        recalculateCart({
          ...previous.cart,
          items: nextItems,
        }),
      );
    }

    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to remove item.");
      }
      const parsed = payload as { cart?: CartSnapshot };
      if (parsed.cart) {
        applyServerCart(parsed.cart);
      }
    } catch (caught) {
      if (previous) {
        setData(previous);
      }
      setError(caught instanceof Error ? caught.message : "Unexpected error.");
    } finally {
      // No per-item loading UI for optimistic interactions.
    }
  }

  async function updateItemQuantity(item: CartItem, direction: "inc" | "dec") {
    const previous = data;
    setError("");
    if (previous) {
      const nextItems = previous.cart.items
        .map((entry) => {
          if (entry.id !== item.id) {
            return entry;
          }

          const nextQuantity = direction === "inc" ? Math.min(entry.quantity + 1, 20) : entry.quantity - 1;
          if (nextQuantity <= 0) {
            return null;
          }

          return {
            ...entry,
            quantity: nextQuantity,
            lineTotal: entry.unitPrice * nextQuantity,
          };
        })
        .filter((entry): entry is CartItem => entry !== null);

      applyServerCart(
        recalculateCart({
          ...previous.cart,
          items: nextItems,
        }),
      );
    }

    try {
      if (direction === "dec" && item.quantity <= 1) {
        const response = await fetch(`/api/cart/items/${item.id}`, {
          method: "DELETE",
        });
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        if (!response.ok) {
          throw new Error(payload.message || "Unable to remove item.");
        }
        const parsed = payload as { cart?: CartSnapshot };
        if (parsed.cart) {
          applyServerCart(parsed.cart);
        }
        return;
      }

      const nextQuantity = direction === "inc" ? Math.min(item.quantity + 1, 20) : item.quantity - 1;
      const response = await fetch(`/api/cart/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: nextQuantity,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to update quantity.");
      }
      const parsed = payload as { cart?: CartSnapshot };
      if (parsed.cart) {
        applyServerCart(parsed.cart);
      }
    } catch (caught) {
      if (previous) {
        setData(previous);
      }
      setError(caught instanceof Error ? caught.message : "Unexpected error.");
    } finally {
      // No per-item loading UI for optimistic interactions.
    }
  }

  return (
    <main className="py-6 sm:py-10">
      <div className="shell grid gap-5">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <section className="panel p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl">Items</h2>
            <Link className="text-sm underline" href="/menu">
              Add more from menu
            </Link>
          </div>

          {!cart ? <p className="mt-3 text-sm">Loading cart...</p> : null}

          {cart && cart.items.length === 0 ? (
            <div className="mt-4 rounded-lg border border-[var(--line)] bg-white p-4 text-sm">
              Cart is empty. Browse menu items to start checkout.
            </div>
          ) : null}

          <div className="mt-3 grid gap-4">
            {cart?.items.map((item) => {
              const draft = drafts[item.id] || {
                specialInstructions: item.specialInstructions || "",
                selectedOptionIds: [...item.selectedOptionIds],
              };

              return (
                <article key={item.id} className="rounded-xl border border-[var(--line)] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 pr-2">
                      <h3 className="line-clamp-2 text-lg font-extrabold">{item.itemName}</h3>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-1 py-1">
                        <button
                          type="button"
                          onClick={() => void updateItemQuantity(item, "dec")}
                          aria-label={`Decrease ${item.itemName}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] text-lg font-bold text-[#9f430e] hover:bg-[#fff3e6] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          -
                        </button>
                        <span className="min-w-7 text-center text-sm font-extrabold text-[#1f1f1f]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => void updateItemQuantity(item, "inc")}
                          disabled={item.quantity >= 20}
                          aria-label={`Increase ${item.itemName}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-lg font-bold text-[var(--accent-ink)] hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-sm font-semibold">${item.lineTotal.toFixed(2)}</p>
                    </div>
                  </div>

                  {item.validationIssues.length > 0 ? (
                    <p className="mt-2 text-xs text-red-700">{item.validationIssues.join(" ")}</p>
                  ) : null}

                  <div className="mt-3 grid gap-3">
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
                        onBlur={() => void saveItem(item)}
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
                                  onChange={() => void toggleDraftOption(item, option.id)}
                                />
                              </span>
                            </label>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-600 bg-red-600 text-white transition-transform duration-150 hover:scale-110 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => deleteItem(item.id)}
                      aria-label={`Delete ${item.itemName}`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="panel p-4 sm:p-6">
          <p className="sr-only">Order Type</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {(config?.orderTypes || ["DINE_IN", "DELIVERY", "PICKUP"]).map((orderType) => (
              <button
                key={orderType}
                type="button"
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                  cart?.orderType === orderType
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                    : "border-[var(--line)] bg-white"
                }`}
                disabled={orderTypePending}
                onClick={() => updateOrderType(orderType)}
              >
                {labelOrderType(orderType)}
              </button>
            ))}
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

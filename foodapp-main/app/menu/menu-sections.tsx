"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SectionNav } from "./section-nav";

type ModifierOption = {
  id: string;
  name: string;
  priceDelta: number;
  isActive: boolean;
};

type ModifierGroup = {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
};

type MenuItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string;
  imageUrls: string[];
  basePrice: number;
  availability?: "active" | "inactive";
  modifierGroups: ModifierGroup[];
};

export type MenuCategorySection = {
  id: string;
  name: string;
  anchor: string;
  items: MenuItem[];
};

type MenuSectionsProps = {
  categorySections: MenuCategorySection[];
  hasMenuItems: boolean;
  embedded?: boolean;
  adminMode?: boolean;
  onAdminEditItem?: (itemId: string) => void | Promise<void>;
};

type CartLine = {
  id: string;
  itemId: string;
  quantity: number;
  specialInstructions: string;
  selectedOptionIds: string[];
};

type CartResponse = {
  cart: {
    items: CartLine[];
  };
};

type CartMutationResponse = {
  cart?: {
    items?: CartLine[];
  };
  message?: string;
};

function formatEuro(value: number) {
  return value.toFixed(2).replace(".", ",");
}

function normalizeIds(ids: string[]) {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}

function toSelectionKey(ids: string[]) {
  return normalizeIds(ids).join("|");
}

function resolveDisplayedPrices(item: {
  basePrice: number;
  modifierGroups: Array<{
    name: string;
    options: Array<{
      name: string;
      priceDelta: number;
    }>;
  }>;
}) {
  const sizeGroup = item.modifierGroups.find((group) => group.name.toLowerCase() === "koko");
  if (!sizeGroup) {
    return {
      largePrice: item.basePrice,
      familyPrice: null,
    };
  }

  const familyOption = sizeGroup.options.find((option) => /family|perhe/i.test(option.name));
  if (!familyOption) {
    return {
      largePrice: item.basePrice,
      familyPrice: null,
    };
  }

  return {
    largePrice: item.basePrice,
    familyPrice: item.basePrice + familyOption.priceDelta,
  };
}

function toCardTag(item: {
  categoryName: string;
}) {
  return item.categoryName;
}

function getDefaultOptionIdsForQuickAdd(groups: ModifierGroup[]) {
  const selected: string[] = [];

  for (const group of groups) {
    const requiredMin = Math.max(group.minSelect, group.isRequired ? 1 : 0);
    if (requiredMin === 0) {
      continue;
    }

    const activeOptions = group.options.filter((option) => option.isActive);
    if (activeOptions.length < requiredMin) {
      return null;
    }

    for (const option of activeOptions.slice(0, requiredMin)) {
      selected.push(option.id);
    }
  }

  return normalizeIds(selected);
}

export function MenuSections({
  categorySections,
  hasMenuItems,
  embedded = false,
  adminMode = false,
  onAdminEditItem,
}: MenuSectionsProps) {
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [isCartReady, setIsCartReady] = useState(false);
  const [pendingByItemId, setPendingByItemId] = useState<Record<string, boolean>>({});

  const loadCart = useCallback(async () => {
    const response = await fetch("/api/cart", {
      method: "GET",
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as CartResponse;
    if (!response.ok) {
      return;
    }

    setCartLines(Array.isArray(payload.cart?.items) ? payload.cart.items : []);
  }, []);

  const applyMutationResponse = useCallback(
    async (response: Response) => {
      const payload = (await response.json().catch(() => ({}))) as CartMutationResponse;
      if (!response.ok) {
        throw new Error(payload.message || "Unable to update cart.");
      }

      const nextItems = payload.cart?.items;
      if (Array.isArray(nextItems)) {
        setCartLines(nextItems);
        return;
      }

      await loadCart();
    },
    [loadCart],
  );

  useEffect(() => {
    if (adminMode) {
      setIsCartReady(true);
      return;
    }

    let unmounted = false;

    const hydrate = async () => {
      await loadCart();
      if (!unmounted) {
        setIsCartReady(true);
      }
    };

    void hydrate();
    const onFocus = () => {
      void loadCart();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      unmounted = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [adminMode, loadCart]);

  const quantityByItemId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const line of cartLines) {
      counts.set(line.itemId, (counts.get(line.itemId) || 0) + line.quantity);
    }
    return counts;
  }, [cartLines]);

  function setItemPending(itemId: string, pending: boolean) {
    setPendingByItemId((current) => {
      if (pending) {
        return { ...current, [itemId]: true };
      }

      const next = { ...current };
      delete next[itemId];
      return next;
    });
  }

  function findTargetLine(item: MenuItem, defaultOptionIds: string[]) {
    const itemLines = cartLines.filter((line) => line.itemId === item.id);
    if (itemLines.length === 0) {
      return null;
    }

    const defaultSelectionKey = toSelectionKey(defaultOptionIds);
    const exactMatch = itemLines.find(
      (line) =>
        line.specialInstructions.trim().length === 0 &&
        toSelectionKey(line.selectedOptionIds) === defaultSelectionKey,
    );
    if (exactMatch) {
      return exactMatch;
    }

    const plainMatch = itemLines.find(
      (line) =>
        line.specialInstructions.trim().length === 0 &&
        line.selectedOptionIds.length === 0 &&
        defaultOptionIds.length === 0,
    );
    if (plainMatch) {
      return plainMatch;
    }

    if (itemLines.length === 1) {
      return itemLines[0];
    }

    return itemLines[0];
  }

  async function mutateItemCount(item: MenuItem, direction: "inc" | "dec") {
    const itemId = item.id;
    if (pendingByItemId[itemId]) {
      return;
    }

    const defaultOptionIds = getDefaultOptionIdsForQuickAdd(item.modifierGroups);
    if (!defaultOptionIds) {
      window.location.href = `/menu/${item.id}`;
      return;
    }

    setItemPending(itemId, true);

    try {
      const targetLine = findTargetLine(item, defaultOptionIds);

      if (direction === "inc") {
        if (!targetLine) {
          const response = await fetch("/api/cart/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              itemId: item.id,
              quantity: 1,
              selectedOptionIds: defaultOptionIds,
              specialInstructions: "",
            }),
          });
          await applyMutationResponse(response);
        } else {
          const response = await fetch(`/api/cart/items/${targetLine.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              quantity: targetLine.quantity + 1,
              selectedOptionIds: targetLine.selectedOptionIds,
              specialInstructions: targetLine.specialInstructions,
            }),
          });
          await applyMutationResponse(response);
        }
      }

      if (direction === "dec" && targetLine) {
        if (targetLine.quantity <= 1) {
          const response = await fetch(`/api/cart/items/${targetLine.id}`, {
            method: "DELETE",
          });
          await applyMutationResponse(response);
        } else {
          const response = await fetch(`/api/cart/items/${targetLine.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              quantity: targetLine.quantity - 1,
              selectedOptionIds: targetLine.selectedOptionIds,
              specialInstructions: targetLine.specialInstructions,
            }),
          });
          await applyMutationResponse(response);
        }
      }
    } catch {
      // Keep control silent on quick interactions.
    } finally {
      setItemPending(itemId, false);
    }
  }

  const sectionNav = (
    <SectionNav
      sections={categorySections}
      orientation="horizontal"
    />
  );

  const sectionsContent = (
    <>
      {categorySections.map((section, index) => (
        <section
          key={section.id}
          id={section.anchor}
          className={`scroll-mt-32 grid gap-4 ${index === 0 ? "pt-4 sm:pt-6" : "pt-12 sm:pt-16"}`}
        >
          <h2 className="mb-4 text-4xl font-black uppercase tracking-tight sm:mb-6 sm:text-5xl">
            {section.name}
          </h2>
          {section.name.toLowerCase() === "salaatit" ? (
            <div className="-mt-2 mb-4 sm:mb-6">
              <p className="text-base font-bold text-[#1f1f1f] sm:text-lg">Salaatti annokset sisaltyy:</p>
              <p className="mt-1 text-base text-[var(--muted)] sm:text-lg">
                Jaavuorisalaatti, kurkku, tomaatti, turkinpippuri
              </p>
            </div>
          ) : null}

          <div className={adminMode ? "grid gap-3" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
            {section.items.map((item) => {
              const prices = resolveDisplayedPrices(item);
              const hasFamilySize = prices.familyPrice !== null;
              const isKebabItem = item.categoryName.toLowerCase() === "kebabit";
              const showDescription = !isKebabItem && item.description.trim().length > 0;
              const isAvailable = item.availability !== "inactive";
              const quantity = quantityByItemId.get(item.id) || 0;
              const pending = Boolean(pendingByItemId[item.id]);

              if (adminMode) {
                return (
                  <article
                    key={item.id}
                    className={`relative flex items-start gap-3 rounded-[18px] border-[3px] border-[#2d1d13] p-3 shadow-[4px_4px_0_0_#2d1d13] ${
                      isAvailable
                        ? "bg-[linear-gradient(160deg,#f1f7f2_0%,#e7f1e9_54%,#d9e8dc_100%)]"
                        : "bg-[linear-gradient(160deg,#ececec_0%,#e2e2e2_54%,#d6d6d6_100%)]"
                    }`}
                  >
                    <Link
                      href={`/menu/${item.id}`}
                      aria-label={`Open details for ${item.name}`}
                      className="absolute inset-0 z-10 rounded-[18px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    >
                      <span className="sr-only">Open details for {item.name}</span>
                    </Link>

                    <div className="flex w-full items-start gap-3">
                      <div className="relative overflow-hidden rounded-lg border-2 border-[#2d1d13] bg-[#fff7ea]">
                        {item.imageUrls[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrls[0]}
                            alt={item.name}
                            className={`h-24 w-28 object-cover ${isAvailable ? "" : "grayscale"}`}
                          />
                        ) : (
                          <div
                            className={`flex h-24 w-28 items-center justify-center text-xs text-[#8a470f] ${
                              isAvailable ? "" : "grayscale"
                            }`}
                          >
                            No image
                          </div>
                        )}
                        {!isAvailable ? (
                          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/40">
                            <span className="rounded-lg bg-black/80 px-3 py-1.5 text-sm font-black uppercase tracking-wide text-white">
                              Unavailable
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="line-clamp-2 text-lg font-extrabold leading-tight text-[#1f1f1f]">
                            {item.name}
                          </h2>
                          <div className="shrink-0 flex flex-col items-end">
                            <p className="text-sm font-extrabold text-[#1f1f1f]">
                              {hasFamilySize ? "L " : ""}&euro;{formatEuro(prices.largePrice)}
                            </p>
                            {prices.familyPrice !== null ? (
                              <p className="text-xs font-extrabold text-[#1f1f1f]">
                                Family &euro;{formatEuro(prices.familyPrice)}
                              </p>
                            ) : null}
                            <span className="mt-1 rounded-full border border-[color:var(--accent)] bg-[color:var(--surface)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--accent)]">
                              incl VAT
                            </span>
                          </div>
                        </div>

                        {showDescription ? (
                          <p className="mt-1 line-clamp-2 text-sm leading-snug text-[#8a470f]">{item.description}</p>
                        ) : null}

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="rounded-full border border-[color:var(--accent)] bg-[#ffe7cb] px-3 py-1 text-xs font-semibold text-[#994b14]">
                            {toCardTag(item)}
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void onAdminEditItem?.(item.id);
                            }}
                            aria-label={`Edit ${item.name}`}
                            className="relative z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] transition-transform duration-150 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={!onAdminEditItem}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L8 18l-4 1 1-4 11.5-11.5z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              }

              return (
                <div key={item.id} className="relative h-full">
                  {!isAvailable ? (
                    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
                      <span className="rounded-lg bg-black/80 px-4 py-2 text-lg font-black uppercase tracking-wide text-white">
                        Unavailable
                      </span>
                    </div>
                  ) : null}

                  <article
                    className={`relative flex h-full flex-col rounded-[20px] border-[3px] border-[#2d1d13] p-4 shadow-[5px_5px_0_0_#2d1d13] ${
                      isAvailable
                        ? "bg-[linear-gradient(160deg,#f1f7f2_0%,#e7f1e9_54%,#d9e8dc_100%)]"
                        : "bg-[linear-gradient(160deg,#ececec_0%,#e2e2e2_54%,#d6d6d6_100%)]"
                    }`}
                  >
                    <div className={isAvailable ? "" : "grayscale"}>
                      {isAvailable ? (
                        <Link
                          href={`/menu/${item.id}`}
                          aria-label={`Open details for ${item.name}`}
                          className="absolute inset-0 z-10 rounded-[20px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                        >
                          <span className="sr-only">Open details for {item.name}</span>
                        </Link>
                      ) : null}

                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-[1.4rem] font-extrabold leading-tight text-[#1f1f1f]">
                          {item.name}
                        </h2>
                        <div className="shrink-0 flex flex-col items-end">
                          <p className="text-sm font-extrabold text-[#1f1f1f]">
                            {hasFamilySize ? "L " : ""}&euro;{formatEuro(prices.largePrice)}
                          </p>
                          {prices.familyPrice !== null ? (
                            <p className="text-sm font-extrabold text-[#1f1f1f]">
                              Family &euro;{formatEuro(prices.familyPrice)}
                            </p>
                          ) : null}
                          <span className="mt-1 rounded-full border border-[color:var(--accent)] bg-[color:var(--surface)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--accent)]">
                            incl VAT
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 overflow-hidden rounded-xl border-2 border-[#2d1d13] bg-[#fff7ea]">
                        {item.imageUrls[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrls[0]} alt={item.name} className="aspect-[4/3] w-full object-cover" />
                        ) : (
                          <div className="flex aspect-[4/3] w-full items-center justify-center text-sm text-[#8a470f]">
                            No image
                          </div>
                        )}
                      </div>

                      {showDescription ? (
                        <p className="mt-1 min-h-[3.8rem] line-clamp-2 text-[1.1rem] leading-snug text-[#8a470f]">
                          {item.description}
                        </p>
                      ) : null}

                      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                        <span className="rounded-full border border-[color:var(--accent)] bg-[#ffe7cb] px-3 py-1 text-sm font-semibold text-[#994b14]">
                          {toCardTag(item)}
                        </span>

                        {quantity > 0 ? (
                          <div className="relative z-20 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-1 py-1">
                            <button
                              type="button"
                              onClick={() => void mutateItemCount(item, "dec")}
                              disabled={pending || !isCartReady || !isAvailable}
                              aria-label={`Decrease ${item.name}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] text-lg font-bold text-[#9f430e] hover:bg-[#fff3e6] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              -
                            </button>
                            <span className="min-w-6 text-center text-sm font-extrabold text-[#1f1f1f]">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => void mutateItemCount(item, "inc")}
                              disabled={pending || !isCartReady || !isAvailable}
                              aria-label={`Increase ${item.name}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-lg font-bold text-[var(--accent-ink)] hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void mutateItemCount(item, "inc")}
                            disabled={pending || !isCartReady || !isAvailable}
                            aria-label={`Add ${item.name} to cart`}
                            className="relative z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] transition-transform duration-150 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="h-6 w-6"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <circle cx="9" cy="20" r="1.6" />
                              <circle cx="18" cy="20" r="1.6" />
                              <path d="M3 4h2l2.2 10.4h10.4l2.2-7.4H7.4" />
                              <path d="M18.2 5.2v4.2" />
                              <path d="M16.1 7.3h4.2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {!hasMenuItems ? (
        <section className="panel p-5 text-sm">No menu items match this filter.</section>
      ) : null}
    </>
  );

  const body = (
    <>
      {sectionNav}
      {sectionsContent}
    </>
  );

  if (embedded) {
    return <div className="grid gap-4">{body}</div>;
  }

  return (
    <main className="py-6 sm:py-10">
      <div className="shell grid gap-4">{body}</div>
    </main>
  );
}

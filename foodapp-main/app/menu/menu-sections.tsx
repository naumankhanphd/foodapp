"use client";
/* eslint-disable @next/next/no-img-element */



import Link from "next/link";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CART_UPDATED_EVENT, dispatchCartUpdated } from "@/lib/cart/events";

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

  focalX?: number | null;

  focalY?: number | null;

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

  adminUseCustomerCards?: boolean;

  onAdminEditItem?: (itemId: string) => void | Promise<void>;
  onAdminDeleteItem?: (itemId: string, itemName: string) => void | Promise<void>;

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

/** Knuth multiplicative hash — better distribution than charSum for consecutive IDs */
function stableHash(id: string, seed: number): number {
  let h = (seed * 2654435761) >>> 0;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 2654435761) >>> 0;
  }
  return h;
}

const CARD_ROTATIONS = [-3, -2.5, -2, -1.5, 1.5, 2, 2.5, 3];


/** Polaroid Stacked Mint — matches C33 */
const MINT_PALETTE = {
  cardBg:     "bg-white",
  layer1:     "bg-emerald-300",
  layer2:     "bg-emerald-100",
  imgBorder:  "border-black",
  imgBg:      "bg-white",
  noImgCls:   "text-gray-400",
  titleCls:   "text-gray-800",
  descCls:    "text-gray-400",
  priceCls:   "text-black",
  qtyWrapCls: "border-emerald-600",
  decCls:     "border-emerald-600 text-emerald-700 hover:bg-emerald-50",
  qtyNumCls:  "text-emerald-700",
  btnCls:     "rounded-full bg-emerald-500 shadow-[2px_2px_0_0_#000]",
  shadow:     "#047857",
} as const;



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



function toPriceBadgeView(prices: { largePrice: number; familyPrice: number | null }) {
  const large = `€${formatEuro(prices.largePrice)}`;
  if (prices.familyPrice === null) {
    return {
      primary: large,
      secondary: null as string | null,
    };
  }

  return {
    primary: large,
    secondary: `€${formatEuro(prices.familyPrice)}`,
  };
}

function PriceBadge({
  prices,
  className,
}: {
  prices: { largePrice: number; familyPrice: number | null };
  className: string;
}) {
  const view = toPriceBadgeView(prices);

  return (
    <span className={`${className} inline-flex flex-col`}>
      <span className="block whitespace-nowrap leading-tight">{view.primary}</span>
      {view.secondary ? (
        <span className="mt-0.5 block whitespace-nowrap text-[0.72rem] font-semibold leading-tight">
          {view.secondary}
        </span>
      ) : null}
    </span>
  );
}

function PriceText({
  prices,
  className,
  showSlashPair = false,
}: {
  prices: { largePrice: number; familyPrice: number | null };
  className?: string;
  showSlashPair?: boolean;
}) {
  const view = toPriceBadgeView(prices);

  if (showSlashPair) {
    const slashText = prices.familyPrice === null
      ? `€${formatEuro(prices.largePrice)}`
      : `€${formatEuro(prices.largePrice)} / €${formatEuro(prices.familyPrice)}`;

    return (
      <div className={`leading-tight text-[#1f1f1f] ${className ?? ""}`}>
        <p className="whitespace-nowrap text-[0.95rem] font-black">{slashText}</p>
      </div>
    );
  }

  if (prices.familyPrice !== null) {
    return (
      <div className={`leading-tight text-[#1f1f1f] ${className ?? ""}`}>
        <p className="text-[0.92rem] font-black text-[#1f1f1f]">Price from €{formatEuro(prices.largePrice)}</p>
      </div>
    );
  }

  return (
    <div className={`leading-tight text-[#1f1f1f] ${className ?? ""}`}>
      <p className="text-[0.95rem] font-black">{view.primary}</p>
      {view.secondary ? <p className="mt-0.5 text-[0.95rem] font-black">{view.secondary}</p> : null}
    </div>
  );
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

  adminUseCustomerCards = false,

  onAdminEditItem,
  onAdminDeleteItem,

}: MenuSectionsProps) {
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [optimisticQty, setOptimisticQty] = useState<Map<string, number>>(() => new Map());
  const mutatingItemIdsRef = useRef<Set<string>>(new Set());
  const queuedItemDeltasRef = useRef<Map<string, number>>(new Map());
  const isCartReady = true;

  function applyOptimistic(itemId: string, serverQty: number, delta: number) {
    setOptimisticQty((prev) => {
      const current = prev.has(itemId) ? prev.get(itemId)! : serverQty;
      const next = Math.max(0, Math.min(20, current + delta));
      const m = new Map(prev);
      m.set(itemId, next);
      return m;
    });
  }

  function clearOptimisticForItem(itemId: string) {
    setOptimisticQty((prev) => {
      if (!prev.has(itemId)) return prev;
      const m = new Map(prev);
      m.delete(itemId);
      return m;
    });
  }

  function beginItemMutation(itemId: string) {
    if (mutatingItemIdsRef.current.has(itemId)) {
      return false;
    }

    mutatingItemIdsRef.current.add(itemId);
    return true;
  }

  function finishItemMutation(itemId: string) {
    if (!mutatingItemIdsRef.current.has(itemId)) {
      return;
    }

    mutatingItemIdsRef.current.delete(itemId);
  }

  function queueItemDelta(itemId: string, delta: number) {
    const current = queuedItemDeltasRef.current.get(itemId) || 0;
    const next = current + delta;
    if (next === 0) {
      queuedItemDeltasRef.current.delete(itemId);
      return;
    }
    queuedItemDeltasRef.current.set(itemId, next);
  }

  function consumeQueuedItemDelta(itemId: string) {
    const queued = queuedItemDeltasRef.current.get(itemId) || 0;
    queuedItemDeltasRef.current.delete(itemId);
    return queued;
  }

  function clampQuantity(value: number) {
    return Math.max(0, Math.min(20, value));
  }

  function renderAdminActions(item: MenuItem, sizeClass: string, iconClass: string) {
    return (
      <div className="relative z-20 inline-flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void onAdminEditItem?.(item.id);
          }}
          aria-label={`Edit ${item.name}`}
          className={`inline-flex items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] transition-transform duration-150 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60 ${sizeClass}`}
          disabled={!onAdminEditItem}
        >
          <svg
            viewBox="0 0 24 24"
            className={iconClass}
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
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void onAdminDeleteItem?.(item.id, item.name);
          }}
          aria-label={`Delete ${item.name}`}
          className={`inline-flex items-center justify-center rounded-full border-2 border-[#c23b22] bg-[#fff4ef] text-[#c23b22] transition-transform duration-150 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60 ${sizeClass}`}
          disabled={!onAdminDeleteItem}
        >
          <svg
            viewBox="0 0 24 24"
            className={iconClass}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
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
    );
  }


  const loadCart = useCallback(async () => {

    const response = await fetch("/api/cart", {

      method: "GET",

      cache: "no-store",

    });



    const payload = (await response.json().catch(() => ({}))) as CartResponse;

    if (!response.ok) {

      return [] as CartLine[];

    }

    const nextItems = Array.isArray(payload.cart?.items) ? payload.cart.items : [];
    setCartLines(nextItems);
    return nextItems;

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
        dispatchCartUpdated();

        return nextItems as CartLine[];

      }



      const reloaded = await loadCart();
      dispatchCartUpdated();
      return reloaded as CartLine[];

    },

    [loadCart],

  );



  useEffect(() => {
    if (adminMode) {
      return;
    }

    const hydrate = async () => {
      await loadCart();
    };

    void hydrate();
    const onFocus = () => {

      void loadCart();

    };
    const onCartUpdated = () => {
      void loadCart();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener(CART_UPDATED_EVENT, onCartUpdated);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(CART_UPDATED_EVENT, onCartUpdated);
    };
  }, [adminMode, loadCart]);


  const quantityByItemId = useMemo(() => {

    const counts = new Map<string, number>();

    for (const line of cartLines) {

      counts.set(line.itemId, (counts.get(line.itemId) || 0) + line.quantity);

    }

    // Overlay optimistic overrides (instant feedback while server is in-flight)
    for (const [itemId, qty] of optimisticQty) {
      counts.set(itemId, qty);
    }

    return counts;

  }, [cartLines, optimisticQty]);



  function findTargetLine(lines: CartLine[], item: MenuItem, defaultOptionIds: string[]) {
    const itemLines = lines.filter((line) => line.itemId === item.id);
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



  async function applyDeltaMutation(
    item: MenuItem,
    defaultOptionIds: string[],
    baseLines: CartLine[],
    delta: number,
  ) {
    if (delta === 0) {
      return baseLines;
    }

    const targetLine = findTargetLine(baseLines, item, defaultOptionIds);

    if (delta > 0) {
      if (!targetLine) {
        const createQuantity = clampQuantity(delta);
        if (createQuantity <= 0) {
          return baseLines;
        }

        const response = await fetch("/api/cart/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: item.id,
            quantity: createQuantity,
            selectedOptionIds: defaultOptionIds,
            specialInstructions: "",
          }),
        });

        return await applyMutationResponse(response);
      }

      const nextQuantity = clampQuantity(targetLine.quantity + delta);
      if (nextQuantity === targetLine.quantity) {
        return baseLines;
      }

      const response = await fetch(`/api/cart/items/${targetLine.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: nextQuantity,
          selectedOptionIds: targetLine.selectedOptionIds,
          specialInstructions: targetLine.specialInstructions,
        }),
      });

      return await applyMutationResponse(response);
    }

    if (!targetLine) {
      return baseLines;
    }

    const nextQuantity = targetLine.quantity + delta;
    if (nextQuantity <= 0) {
      const response = await fetch(`/api/cart/items/${targetLine.id}`, {
        method: "DELETE",
      });
      return await applyMutationResponse(response);
    }

    const clampedNextQuantity = clampQuantity(nextQuantity);
    if (clampedNextQuantity === targetLine.quantity) {
      return baseLines;
    }

    const response = await fetch(`/api/cart/items/${targetLine.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity: clampedNextQuantity,
        selectedOptionIds: targetLine.selectedOptionIds,
        specialInstructions: targetLine.specialInstructions,
      }),
    });

    return await applyMutationResponse(response);
  }

  // skipOptimistic=true is used for the trailing-delta recursive call: the user
  // already clicked those buttons (optimistic was applied then), so we must not
  // add it a second time here.
  async function mutateItemCount(item: MenuItem, direction: "inc" | "dec", skipOptimistic = false) {
    const defaultOptionIds = getDefaultOptionIdsForQuickAdd(item.modifierGroups);
    if (!defaultOptionIds) {
      window.location.assign(`/menu/${item.id}`);
      return;
    }

    const delta = direction === "inc" ? 1 : -1;

    // Immediately reflect the change in the UI — no waiting for the server.
    // Skipped for the internal trailing-delta recursive call to avoid double-counting.
    if (!skipOptimistic) {
      const serverQty = quantityByItemId.get(item.id) || 0;
      applyOptimistic(item.id, serverQty, delta);
    }

    if (!beginItemMutation(item.id)) {
      queueItemDelta(item.id, delta);
      return;
    }

    try {
      let latestLines = cartLines;
      latestLines = await applyDeltaMutation(item, defaultOptionIds, latestLines, delta);

      while (true) {
        const queuedDelta = consumeQueuedItemDelta(item.id);
        if (queuedDelta === 0) break;
        latestLines = await applyDeltaMutation(item, defaultOptionIds, latestLines, queuedDelta);
      }
    } catch {
      // On error revert optimistic and reload from server
      clearOptimisticForItem(item.id);
      await loadCart();
    } finally {
      finishItemMutation(item.id);
      const trailingDelta = consumeQueuedItemDelta(item.id);
      if (trailingDelta !== 0) {
        const sign = trailingDelta > 0 ? 1 : -1;
        const remainder = trailingDelta - sign;
        if (remainder !== 0) {
          queueItemDelta(item.id, remainder);
        }
        // Pass skipOptimistic=true: these trailing clicks already updated the
        // optimistic counter when the user pressed the button.
        void mutateItemCount(item, sign > 0 ? "inc" : "dec", true);
      } else {
        // All mutations done — let server state take over display
        clearOptimisticForItem(item.id);
      }
    }
  }


  const sectionNav = (

    <SectionNav

      sections={categorySections}

      orientation="horizontal"

    />

  );

  const useAdminCompactCards = adminMode && !adminUseCustomerCards;



  const sectionsContent = (

    <>

      {categorySections.map((section, index) => (

        <section

          key={section.id}

          id={section.anchor}

          className={`scroll-mt-32 grid gap-4 ${index === 0 ? "pt-3 sm:pt-5" : "pt-7 sm:pt-9"}`}

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



          <div
            className={
              useAdminCompactCards
                ? "grid gap-3"
                : "grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:grid-cols-4"
            }
          >
            {section.items.map((item) => {
              const prices = resolveDisplayedPrices(item);
              const isKebabItem = item.categoryName.toLowerCase() === "kebabit";
              const showDescription = !isKebabItem && item.description.trim().length > 0;
              const isAvailable = item.availability !== "inactive";
              const quantity = quantityByItemId.get(item.id) || 0;


              if (useAdminCompactCards) {

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

                      <div className="order-2 relative h-[148px] w-[184px] shrink-0 overflow-hidden rounded-lg border-2 border-[#2d1d13] bg-[#fff7ea]">

                        {item.imageUrls[0] ? (

                          
                          <img

                            src={item.imageUrls[0]}

                            alt={item.name}

                            className={`h-full w-full object-cover ${isAvailable ? "" : "grayscale"}`}

                            style={{ objectPosition: `${item.focalX ?? 50}% ${item.focalY ?? 50}%` }}

                          />

                        ) : (

                          <div

                            className={`flex h-full w-full items-center justify-center text-xs text-[#8a470f] ${

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



                      <div className="order-1 min-w-0 grid min-h-[148px] flex-1 grid-rows-[auto_1fr_auto] gap-1.5">
                        <h2 className="line-clamp-2 text-lg font-extrabold leading-tight text-[#1f1f1f]">
                          {item.name}
                        </h2>

                        <p className="mt-1 h-[2.4rem] overflow-hidden text-sm leading-[1.2rem] text-[#8a470f] line-clamp-2">
                          {showDescription ? item.description : "\u00A0"}
                        </p>


                        <div className="flex items-center justify-between gap-2">

                          <PriceBadge
                            prices={prices}
                            className="rounded-full border border-[color:var(--accent)] bg-[#ffe7cb] px-3 py-1 text-xs font-semibold text-[#994b14]"
                          />
                          {renderAdminActions(item, "h-9 w-9", "h-5 w-5")}

                        </div>

                      </div>

                    </div>

                  </article>

                );

              }

              const cardRot = CARD_ROTATIONS[stableHash(item.id, 1) % CARD_ROTATIONS.length];
              const palette = MINT_PALETTE;

              return (

                <div key={item.id} className="relative mx-auto w-full max-w-[200px]" style={{ transform: `rotate(${cardRot}deg)` }}>
                  {/* Back layers */}
                  <div className={`absolute inset-0 ${palette.layer1}`} style={{ transform: "translateX(8px) translateY(6px) rotate(4deg)" }} />
                  <div className={`absolute inset-0 ${palette.layer2}`} style={{ transform: "translateX(4px) translateY(3px) rotate(2deg)" }} />
                  {!isAvailable ? (
                    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
                      <span className="rounded-lg bg-black/80 px-3 py-1.5 text-sm font-black uppercase tracking-wide text-white">
                        Unavailable
                      </span>
                    </div>
                  ) : null}
                  <article
                    className={`relative ${palette.cardBg} p-3 pb-8 ${isAvailable ? "" : "grayscale"}`}
                    style={{ boxShadow: `4px 4px 0 0 ${palette.shadow}` }}
                  >
                    {isAvailable ? (
                      <Link
                        href={`/menu/${item.id}`}
                        aria-label={`Open details for ${item.name}`}
                        className="absolute inset-0 z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                      >
                        <span className="sr-only">Open details for {item.name}</span>
                      </Link>
                    ) : null}
                    <div className={`h-40 w-full overflow-hidden border-2 ${palette.imgBorder}`}>
                      {item.imageUrls[0] ? (
                        <img
                          src={item.imageUrls[0]}
                          alt={item.name}
                          className="h-full w-full object-cover"
                          style={{ objectPosition: `${item.focalX ?? 50}% ${item.focalY ?? 50}%` }}
                        />
                      ) : (
                        <div className={`flex h-full w-full items-center justify-center text-xs ${palette.noImgCls}`}>No image</div>
                      )}
                    </div>
                    <div className="pt-3 text-center" style={{ fontFamily: "Georgia, serif" }}>
                      <h2 className={`line-clamp-2 text-base font-bold leading-tight ${palette.titleCls}`}>{item.name}</h2>
                      {showDescription ? (
                        <p className={`mt-0.5 line-clamp-2 text-[0.72rem] font-semibold italic ${palette.descCls}`}>{item.description}</p>
                      ) : null}
                      <div className="relative z-20 mt-2 flex items-center justify-between gap-1">
                        <span className={`text-sm font-black ${palette.priceCls}`}>
                          {prices.familyPrice !== null
                            ? `from €${formatEuro(prices.largePrice)}`
                            : `€${formatEuro(prices.largePrice)}`}
                        </span>
                        {adminMode ? (
                          renderAdminActions(item, "h-8 w-8", "h-4 w-4")
                        ) : quantity > 0 ? (
                          <div className={`inline-flex items-center gap-0.5 rounded-full border ${palette.qtyWrapCls} bg-white px-0.5 py-0.5`}>
                            <button
                              type="button"
                              onClick={() => void mutateItemCount(item, "dec")}
                              disabled={!isCartReady || !isAvailable}
                              aria-label={`Decrease ${item.name}`}
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60 ${palette.decCls}`}
                            >
                              -
                            </button>
                            <span className={`min-w-4 text-center text-xs font-extrabold ${palette.qtyNumCls}`}>{quantity}</span>
                            <button
                              type="button"
                              onClick={() => void mutateItemCount(item, "inc")}
                              disabled={!isCartReady || !isAvailable}
                              aria-label={`Increase ${item.name}`}
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white hover:scale-110 disabled:cursor-not-allowed disabled:opacity-60 ${palette.btnCls}`}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void mutateItemCount(item, "inc")}
                            disabled={!isCartReady || !isAvailable}
                            aria-label={`Add ${item.name} to cart`}
                            className={`relative z-20 px-2.5 py-1 text-[0.65rem] font-black text-white hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 ${palette.btnCls}`}
                          >
                            Add
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

    <main className="pt-0 pb-6 sm:pb-10">

      <div className="mx-auto grid w-[min(1460px,calc(100%-2rem))] gap-4">{body}</div>

    </main>

  );

}


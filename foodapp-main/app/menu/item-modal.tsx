"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { dispatchCartUpdated } from "@/lib/cart/events";

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

type ModalItem = {
  id: string;
  name: string;
  description: string;
  imageUrls: string[];
  basePrice: number;
  focalX?: number | null;
  focalY?: number | null;
  categoryName: string;
  modifierGroups: ModifierGroup[];
};

type ItemModalProps = {
  item: ModalItem;
  onClose: () => void;
};

function formatEuro(value: number) {
  return value.toFixed(2).replace(".", ",");
}

export function ItemModal({ item, onClose }: ItemModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const optionById = useMemo(() => {
    const map = new Map<string, ModifierOption>();
    for (const group of item.modifierGroups) {
      for (const option of group.options) {
        map.set(option.id, option);
      }
    }
    return map;
  }, [item.modifierGroups]);

  const modifierTotal = selectedOptionIds.reduce((sum, optionId) => {
    const option = optionById.get(optionId);
    return sum + (option ? option.priceDelta : 0);
  }, 0);

  const unitPrice = item.basePrice + modifierTotal;

  function getSelectionCount(groupId: string, selected = selectedOptionIds) {
    let count = 0;
    for (const optionId of selected) {
      const group = item.modifierGroups.find((entry) =>
        entry.options.some((option) => option.id === optionId),
      );
      if (group?.id === groupId) count += 1;
    }
    return count;
  }

  function toggleOption(group: ModifierGroup, optionId: string) {
    setError("");
    setMessage("");
    setSelectedOptionIds((current) => {
      if (current.includes(optionId)) {
        return current.filter((entry) => entry !== optionId);
      }
      const selectionCount = getSelectionCount(group.id, current);
      if (selectionCount >= group.maxSelect) {
        setError(`"${group.name}" allows max ${group.maxSelect} selection(s).`);
        return current;
      }
      return [...current, optionId];
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          quantity,
          selectedOptionIds,
          specialInstructions,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to add item to cart.");
      }

      setMessage("Added to cart!");
      dispatchCartUpdated();
      setTimeout(() => onClose(), 800);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error.");
    } finally {
      setPending(false);
    }
  }

  const isKebabItem = item.categoryName.toLowerCase() === "kebabit";
  const showDescription = !isKebabItem && item.description.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center sm:justify-center bg-black/60 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border-t-[3px] border-x-[3px] border-[#2d1d13] bg-[#faf5ef] sm:max-w-lg sm:rounded-2xl sm:border-[3px] sm:shadow-[6px_6px_0_0_#2d1d13]">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#2d1d13] bg-white text-lg font-bold text-[#2d1d13] hover:bg-gray-100"
          aria-label="Close"
        >
          &times;
        </button>

        {/* Image */}
        <div className="h-52 w-full overflow-hidden sm:h-64">
          {item.imageUrls[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrls[0]}
              alt={item.name}
              className="h-full w-full object-cover"
              style={{ objectPosition: `${item.focalX ?? 50}% ${item.focalY ?? 50}%` }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#f0ebe4]" />
          )}
        </div>

        <div className="p-5 sm:p-6">
          {/* Header */}
          <h2 className="text-2xl font-black text-[#1f1f1f]">{item.name}</h2>
          {showDescription ? (
            <p className="mt-1 text-sm text-[#8a470f]">{item.description}</p>
          ) : null}
          <p className="mt-2 text-lg font-bold text-[#1f1f1f]">&euro;{formatEuro(unitPrice)}</p>

          {/* Add to cart form */}
          <form onSubmit={submit} className="mt-4 grid gap-4">
            {/* Modifier groups */}
            {item.modifierGroups.map((group) => {
              const selectedCount = getSelectionCount(group.id);
              const requiredMin = Math.max(group.minSelect, group.isRequired ? 1 : 0);
              const invalid = selectedCount < requiredMin;

              return (
                <section key={group.id} className="rounded-xl border-2 border-[#2d1d13] bg-white p-3">
                  <h3 className="text-sm font-bold text-[#1f1f1f]">{group.name}</h3>
                  <p className={`mt-0.5 text-xs ${invalid ? "text-red-600" : "text-gray-500"}`}>
                    Select {requiredMin}-{group.maxSelect}
                  </p>
                  <div className="mt-2 grid gap-1.5">
                    {group.options.filter((o) => o.isActive).map((option) => (
                      <label key={option.id} className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50">
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedOptionIds.includes(option.id)}
                            onChange={() => toggleOption(group, option.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span>{option.name}</span>
                        </span>
                        {option.priceDelta > 0 ? (
                          <span className="text-xs text-gray-500">+&euro;{formatEuro(option.priceDelta)}</span>
                        ) : null}
                      </label>
                    ))}
                  </div>
                </section>
              );
            })}

            {/* Quantity */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-[#1f1f1f]">Quantity</span>
              <div className="inline-flex items-center gap-0 rounded-lg border-2 border-[#2d1d13] bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-1.5 text-sm font-bold hover:bg-gray-100"
                >
                  -
                </button>
                <span className="min-w-8 text-center text-sm font-bold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                  className="px-3 py-1.5 text-sm font-bold hover:bg-gray-100"
                >
                  +
                </button>
              </div>
            </div>

            {/* Special instructions */}
            <textarea
              className="min-h-16 rounded-xl border-2 border-[#2d1d13] bg-white px-3 py-2 text-sm placeholder:text-gray-400"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              maxLength={280}
              placeholder="Special instructions (optional)"
            />

            {message ? <p className="text-sm font-semibold text-green-700">{message}</p> : null}
            {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}

            {/* Submit */}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-black text-white shadow-[3px_3px_0_0_#2d1d13] hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Adding..." : `Add to cart - \u20AC${formatEuro(unitPrice * quantity)}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

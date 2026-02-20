"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

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

type AddToCartItem = {
  id: string;
  name: string;
  basePrice: number;
  modifierGroups: ModifierGroup[];
};

type AddToCartFormProps = {
  item: AddToCartItem;
};

export function AddToCartForm({ item }: AddToCartFormProps) {
  const [quantity, setQuantity] = useState("1");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

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
      if (group?.id === groupId) {
        count += 1;
      }
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
          quantity: Number(quantity),
          selectedOptionIds,
          specialInstructions,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Unable to add item to cart.");
      }

      setMessage("Item added to cart.");
      setSpecialInstructions("");
      setQuantity("1");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="panel p-4 sm:p-6" onSubmit={submit}>
      <h2 className="text-xl">Add to Cart</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">Menu prices include VAT/tax.</p>

      <div className="mt-3 grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Quantity
          </span>
          <input
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
            type="number"
            min={1}
            max={20}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            required
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Special Instructions
          </span>
          <textarea
            className="min-h-20 rounded-lg border border-[var(--line)] bg-white px-3 py-2"
            value={specialInstructions}
            onChange={(event) => setSpecialInstructions(event.target.value)}
            maxLength={280}
            placeholder="No onions, extra crispy, etc."
          />
        </label>
      </div>

      <div className="mt-4 grid gap-3">
        {item.modifierGroups.map((group) => {
          const selectedCount = getSelectionCount(group.id);
          const requiredMin = Math.max(group.minSelect, group.isRequired ? 1 : 0);
          const invalid = selectedCount < requiredMin || selectedCount > group.maxSelect;

          return (
            <section key={group.id} className="rounded-lg border border-[var(--line)] bg-white p-3">
              <h3 className="text-sm font-semibold">{group.name}</h3>
              <p className={`mt-1 text-xs ${invalid ? "text-red-700" : "text-[var(--muted)]"}`}>
                Select {requiredMin}-{group.maxSelect}
              </p>
              <div className="mt-2 grid gap-2">
                {group.options.map((option) => (
                  <label key={option.id} className="flex items-center justify-between gap-3 text-sm">
                    <span>{option.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs text-[var(--muted)]">+${option.priceDelta.toFixed(2)}</span>
                      <input
                        type="checkbox"
                        checked={selectedOptionIds.includes(option.id)}
                        onChange={() => toggleOption(group, option.id)}
                      />
                    </span>
                  </label>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-4 rounded-lg border border-[var(--line)] bg-white p-3 text-sm">
        <p className="flex items-center justify-between">
          <span>Unit price</span>
          <span>${unitPrice.toFixed(2)} incl. VAT</span>
        </p>
      </div>

      {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)]"
          disabled={pending}
        >
          {pending ? "Adding..." : "Add to cart"}
        </button>
        <Link
          href="/cart"
          className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
        >
          View cart
        </Link>
      </div>
    </form>
  );
}

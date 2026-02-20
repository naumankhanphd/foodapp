"use client";

import { useState } from "react";

type QuickAddButtonProps = {
  itemId: string;
  itemName: string;
  className?: string;
};

export function QuickAddButton({ itemId, itemName, className }: QuickAddButtonProps) {
  const [pending, setPending] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  async function addToCart() {
    if (pending) {
      return;
    }

    setPending(true);
    setJustAdded(false);

    try {
      const response = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          quantity: 1,
          selectedOptionIds: [],
          specialInstructions: "",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || "Unable to add item to cart.");
      }

      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 1200);
    } catch {
      // Keep this interaction silent for quick-add icon to avoid noisy UI.
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={addToCart}
      aria-label={`Add ${itemName} to cart`}
      title={justAdded ? "Added" : "Add to cart"}
      className={`${className || ""} ${justAdded ? "ring-2 ring-[#2d1d13]" : ""}`}
      disabled={pending}
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
  );
}

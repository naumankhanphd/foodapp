/**
 * TEMPORARY — used only by /allcards showcase page.
 * Returns up to 4 menu items (preferring those with images).
 * Each item includes a `prices` array: single-element for regular items,
 * multi-element for dual-price items (pizza Large / Family).
 * Delete when the card showcase is no longer needed.
 */
import { NextResponse } from "next/server";
import { listPublicMenuFromDb } from "../../../../lib/menu/drizzle-menu.ts";

export const dynamic = "force-dynamic";

type PriceEntry = { label: string; amount: string };

function buildPrices(
  basePrice: number,
  modifierGroups: Awaited<ReturnType<typeof listPublicMenuFromDb>>["items"][number]["modifierGroups"],
): PriceEntry[] {
  // Look for a required single-select group — this is the size picker on pizza items.
  // Options in that group carry a priceDelta relative to basePrice.
  const sizeGroup = modifierGroups.find(
    (g) => g.isRequired && g.minSelect === 1 && g.maxSelect === 1 && g.options.length > 1,
  );

  if (sizeGroup) {
    return sizeGroup.options
      .filter((o) => o.isActive)
      .map((o) => ({
        label:  o.name,
        amount: `€${(basePrice + o.priceDelta).toFixed(2)}`,
      }));
  }

  // Regular single-price item
  return [{ label: "", amount: `€${basePrice.toFixed(2)}` }];
}

export async function GET() {
  try {
    const { items } = await listPublicMenuFromDb({});

    const withImage    = items.filter((i) => i.imageUrls.length > 0);
    const withoutImage = items.filter((i) => i.imageUrls.length === 0);

    const selected = [
      ...withImage.slice(0, 2),
      ...withoutImage.slice(0, Math.max(0, 2 - withImage.length)),
      ...withImage.slice(2, 4),
      ...withoutImage.slice(0, Math.max(0, 4 - Math.min(withImage.length, 4))),
    ].slice(0, 4);

    const payload = selected.map((item) => ({
      id:          item.id,
      name:        item.name,
      description: item.description,
      category:    item.categoryName,
      prices:      buildPrices(item.basePrice, item.modifierGroups),
      imageUrl:    item.imageUrls[0] ?? null,
      focalX:      item.focalX ?? 50,
      focalY:      item.focalY ?? 50,
    }));

    return NextResponse.json({ items: payload });
  } catch (err) {
    console.error("[/api/allcards/sample-items]", err);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}

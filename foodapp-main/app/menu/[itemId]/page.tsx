import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicItemDetailFromDb } from "@/lib/menu/drizzle-menu";
import { AddToCartForm } from "./add-to-cart-form";

type ItemPageProps = {
  params: Promise<{ itemId: string }>;
};

type MenuModifierOption = {
  id: string;
  name: string;
  priceDelta: number;
  isActive: boolean;
};

type MenuModifierGroup = {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  options: MenuModifierOption[];
};

type PublicMenuItemDetail = {
  id: string;
  name: string;
  description: string;
  imageUrls: string[];
  basePrice: number;
  prepMinutes: number;
  availability: string;
  category: { id: string; name: string };
  modifierGroups: MenuModifierGroup[];
};

export default async function MenuItemDetailPage({ params }: ItemPageProps) {
  const { itemId } = await params;

  let item: PublicMenuItemDetail;
  try {
    item = (await getPublicItemDetailFromDb(itemId)) as PublicMenuItemDetail;
  } catch {
    notFound();
  }
  const isKebabItem = item.category.name.toLowerCase() === "kebabit";

  return (
    <main className="py-6 sm:py-10">
      <div className="shell grid gap-5">
        <header className="panel p-5 sm:p-7">
          <p className="badge">Menu Item</p>
          <h1 className="mt-3 text-3xl sm:text-4xl">{item.name}</h1>
          {!isKebabItem && item.description.trim().length > 0 ? (
            <p className="mt-2 text-sm sm:text-base">{item.description}</p>
          ) : null}
          <p className="mt-2 text-xs text-[var(--muted)]">Category: {item.category.name}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Prep time: {item.prepMinutes} min</p>
          <p className="mt-1 text-xs text-green-700">Availability: {item.availability}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Menu prices include VAT/tax.
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <article className="panel p-4 sm:p-6">
            <h2 className="text-xl">Images</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {item.imageUrls.length === 0 ? (
                <div className="rounded-lg border border-[var(--line)] bg-white p-4 text-sm">No images</div>
              ) : (
                item.imageUrls.map((imageUrl) => (
                  <div key={imageUrl} className="aspect-video overflow-hidden rounded-lg border border-[var(--line)] bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 grid gap-2 text-sm">
              <p>
                <span className="font-semibold">Base price:</span> ${item.basePrice.toFixed(2)} incl. VAT
              </p>
            </div>
          </article>

          <aside className="panel p-4 sm:p-6">
            <AddToCartForm item={item} />

            <div className="mt-4">
            <h2 className="text-xl">Modifier Groups</h2>
            <div className="mt-3 grid gap-3">
              {item.modifierGroups.length === 0 ? (
                <p className="text-sm">No modifiers configured.</p>
              ) : (
                item.modifierGroups.map((group) => (
                  <article key={group.id} className="rounded-lg border border-[var(--line)] bg-white p-3 text-sm">
                    <h3 className="font-semibold">{group.name}</h3>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Rule: {group.isRequired ? "required" : "optional"} | min {group.minSelect} | max {group.maxSelect}
                    </p>
                    <ul className="mt-2 grid gap-1">
                      {group.options.map((option) => (
                        <li key={option.id} className="flex items-center justify-between text-xs">
                          <span>{option.name}</span>
                          <span>+${option.priceDelta.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))
              )}
            </div>
            </div>

            <Link
              href="/menu"
              className="mt-4 inline-flex rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold"
            >
              Back to menu
            </Link>
          </aside>
        </section>
      </div>
    </main>
  );
}

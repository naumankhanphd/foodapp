import { listPublicMenuUseCase } from "@/lib/menu/use-cases.ts";
import { MenuPageClient } from "./menu-page-client";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const menu = await listPublicMenuUseCase({}).catch(() => ({ categories: [], items: [] }));
  const categorySections = menu.categories
    .map((category) => ({
      ...category,
      anchor: `menu-section-${category.id}`,
      items: menu.items.filter((item) => item.categoryId === category.id),
    }))
    .filter((section) => section.items.length > 0);

  return <MenuPageClient categorySections={categorySections} hasMenuItems={menu.items.length > 0} />;
}

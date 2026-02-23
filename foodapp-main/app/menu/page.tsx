import { listPublicMenuFromDb } from "@/lib/menu/drizzle-menu";
import { MenuPageClient } from "./menu-page-client";

export default async function MenuPage() {
  const menu = await listPublicMenuFromDb();
  const categorySections = menu.categories
    .map((category) => ({
      ...category,
      anchor: `menu-section-${category.id}`,
      items: menu.items.filter((item) => item.categoryId === category.id),
    }))
    .filter((section) => section.items.length > 0);

  return <MenuPageClient categorySections={categorySections} hasMenuItems={menu.items.length > 0} />;
}

import { asc, eq, sql } from "drizzle-orm";
import { db } from "../db/client.ts";
import { imagesMetadata, menuCategories, menuItems } from "../db/menu-schema.ts";
import { MenuValidationError } from "./validation.ts";

type MenuCategory = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
};

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

type DbMenuItem = {
  id: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  categorySortOrder: number;
  name: string;
  description: string;
  imageUrls: string[];
  basePrice: number;
  familyPrice: number | null;
  focalX: number | null;
  focalY: number | null;
  prepMinutes: number;
  isActive: boolean;
  updatedAt: string;
};

type PublicMenuItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  categorySortOrder: number;
  name: string;
  description: string;
  imageUrls: string[];
  basePrice: number;
  focalX: number | null;
  focalY: number | null;
  prepMinutes: number;
  isActive: boolean;
  availability: "active" | "inactive";
  modifierGroups: ModifierGroup[];
};

type PublicMenuResponse = {
  categories: Array<{
    id: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
  }>;
  items: PublicMenuItem[];
  search: string;
};

type PublicItemDetail = {
  id: string;
  name: string;
  description: string;
  imageUrls: string[];
  basePrice: number;
  prepMinutes: number;
  availability: "active";
  category: {
    id: string;
    name: string;
  };
  modifierGroups: ModifierGroup[];
};

type AdminCategory = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
  itemCount: number;
};

type AdminItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string;
  imageUrls: string[];
  basePrice: number;
  familyPrice?: number;
  focalX: number | null;
  focalY: number | null;
  prepMinutes: number;
  isActive: boolean;
  updatedAt: string;
  modifierGroups: ModifierGroup[];
};

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number(value.toFixed(2));
  }
  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Number(parsed.toFixed(2));
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function toId(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "category";
}

function normalizeSearch(search: string | undefined) {
  return String(search || "").trim().toLowerCase();
}

function createItemId() {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `item-${stamp}${rand}`;
}

const ASSET_BASE_URL = String(process.env.ASSET_BASE_URL || "")
  .trim()
  .replace(/\/+$/, "");

function isAbsoluteImageUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function normalizeImageLink(imageLink: string) {
  const trimmed = String(imageLink || "").trim();
  if (!trimmed) return null;
  if (isAbsoluteImageUrl(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function toImageNameFromLink(imageLink: string) {
  if (isAbsoluteImageUrl(imageLink)) {
    try {
      const parsed = new URL(imageLink);
      const cleanPath = parsed.pathname.replace(/^\/+/, "");
      return cleanPath || parsed.hostname;
    } catch {
      return imageLink;
    }
  }
  return imageLink.replace(/^\/+/, "");
}

function toPublicImageUrls(imageLink: unknown) {
  const raw = String(imageLink || "").trim();
  if (!raw) return [];
  if (isAbsoluteImageUrl(raw)) return [raw];
  if (raw.startsWith("//")) return [`https:${raw}`];
  if (raw.startsWith("/") && ASSET_BASE_URL) return [`${ASSET_BASE_URL}${raw}`];
  return [raw.startsWith("/") ? raw : `/${raw}`];
}

function inferImageType(imageName: string) {
  const lower = imageName.split("?")[0].split("#")[0].toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".avif")) return "image/avif";
  return "image/jpeg";
}

async function resolveImageMetadataId(
  imageUrls: string[] | undefined,
): Promise<number | null | undefined> {
  if (imageUrls === undefined) return undefined;

  const firstLink = normalizeImageLink(imageUrls[0] || "");
  if (!firstLink) return null;

  const [existing] = await db
    .select({ id: imagesMetadata.id })
    .from(imagesMetadata)
    .where(eq(imagesMetadata.imageLink, firstLink))
    .limit(1);

  if (existing?.id) return existing.id;

  const imageName = toImageNameFromLink(firstLink);
  const insertResult = await db.insert(imagesMetadata).values({
    imageName,
    imageLink: firstLink,
    imageHeight: null,
    imageWidth: null,
    imageType: inferImageType(imageName),
  });

  const insertId = Number((insertResult as { insertId?: unknown }).insertId);
  if (Number.isFinite(insertId) && insertId > 0) return insertId;

  const [inserted] = await db
    .select({ id: imagesMetadata.id })
    .from(imagesMetadata)
    .where(eq(imagesMetadata.imageLink, firstLink))
    .limit(1);

  return inserted?.id || null;
}

function buildPizzaSizeGroup(itemId: string, largePrice: number, familyPrice: number): ModifierGroup[] {
  const delta = roundMoney(familyPrice - largePrice);
  return [
    {
      id: `grp-${itemId}-size`,
      name: "Koko",
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      options: [
        { id: `opt-${itemId}-large`, name: "Large", priceDelta: 0, isActive: true },
        { id: `opt-${itemId}-family`, name: "Family", priceDelta: delta, isActive: true },
      ],
    },
  ];
}

function toModifierGroups(item: DbMenuItem): ModifierGroup[] {
  if (item.familyPrice === null) return [];
  return buildPizzaSizeGroup(item.id, item.basePrice, item.familyPrice);
}

function toPublicItem(item: DbMenuItem): PublicMenuItem {
  return {
    id: item.id,
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    categorySortOrder: item.categorySortOrder,
    name: item.name,
    description: item.description,
    imageUrls: item.imageUrls,
    basePrice: item.basePrice,
    focalX: item.focalX,
    focalY: item.focalY,
    prepMinutes: item.prepMinutes,
    isActive: item.isActive,
    availability: item.isActive ? "active" : "inactive",
    modifierGroups: toModifierGroups(item),
  };
}

function toAdminItem(item: DbMenuItem): AdminItem {
  const mapped: AdminItem = {
    id: item.id,
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    name: item.name,
    description: item.description,
    imageUrls: item.imageUrls,
    basePrice: item.basePrice,
    focalX: item.focalX,
    focalY: item.focalY,
    prepMinutes: item.prepMinutes,
    isActive: item.isActive,
    updatedAt: item.updatedAt,
    modifierGroups: toModifierGroups(item),
  };
  if (item.familyPrice !== null) {
    mapped.familyPrice = item.familyPrice;
  }
  return mapped;
}

function toPublicDetail(item: DbMenuItem): PublicItemDetail {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    imageUrls: item.imageUrls,
    basePrice: item.basePrice,
    prepMinutes: item.prepMinutes,
    availability: "active",
    category: { id: item.categoryId, name: item.categoryName },
    modifierGroups: toModifierGroups(item),
  };
}

function matchSearch(item: DbMenuItem, normalizedSearch: string) {
  if (!normalizedSearch) return true;
  return (
    item.name.toLowerCase().includes(normalizedSearch) ||
    item.description.toLowerCase().includes(normalizedSearch) ||
    item.categoryName.toLowerCase().includes(normalizedSearch)
  );
}

function sortByCategoryThenPriceThenName(left: DbMenuItem, right: DbMenuItem) {
  if (left.categorySortOrder !== right.categorySortOrder) {
    return left.categorySortOrder - right.categorySortOrder;
  }
  if (left.basePrice !== right.basePrice) {
    return left.basePrice - right.basePrice;
  }
  return left.name.localeCompare(right.name);
}

function paginate<T>(records: T[], page: number, pageSize: number) {
  const total = records.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (normalizedPage - 1) * pageSize;
  const data = records.slice(startIndex, startIndex + pageSize);
  return {
    data,
    pagination: {
      page: normalizedPage,
      pageSize,
      total,
      totalPages,
      hasPreviousPage: normalizedPage > 1,
      hasNextPage: normalizedPage < totalPages,
    },
  };
}

async function listAllCategories() {
  const rows = await db
    .select({
      id: menuCategories.id,
      slug: menuCategories.slug,
      name: menuCategories.name,
      sortOrder: menuCategories.sortOrder,
      isActive: menuCategories.isActive,
      updatedAt: menuCategories.updatedAt,
    })
    .from(menuCategories)
    .orderBy(asc(menuCategories.sortOrder), asc(menuCategories.name));
  return rows as MenuCategory[];
}

function categoryMapById(categories: MenuCategory[]) {
  const map = new Map<string, MenuCategory>();
  for (const cat of categories) map.set(cat.id, cat);
  return map;
}

function supportsCategory(targetCategoryId: string | undefined, categoryId: string) {
  return !targetCategoryId || targetCategoryId === categoryId;
}

function rowToDbMenuItem(
  row: {
    id: string;
    categoryId: string;
    name: string;
    description: string | null;
    imageLink: string | null;
    basePrice: string | null;
    largePrice: string | null;
    familyPrice: string | null;
    imageFocalX: string | null;
    imageFocalY: string | null;
    prepMinutes: number;
    isActive: boolean;
    updatedAt: string;
  },
  category: MenuCategory,
): DbMenuItem {
  const isDualPrice = row.largePrice !== null;
  return {
    id: row.id,
    categoryId: row.categoryId,
    categorySlug: category.slug,
    categoryName: category.name,
    categorySortOrder: category.sortOrder,
    name: row.name,
    description: row.description ?? "",
    imageUrls: toPublicImageUrls(row.imageLink),
    basePrice: isDualPrice ? toNumber(row.largePrice) : toNumber(row.basePrice),
    familyPrice: row.familyPrice !== null ? toNumber(row.familyPrice) : null,
    focalX: row.imageFocalX !== null ? toNumber(row.imageFocalX) : null,
    focalY: row.imageFocalY !== null ? toNumber(row.imageFocalY) : null,
    prepMinutes: row.prepMinutes,
    isActive: row.isActive,
    updatedAt: row.updatedAt,
  };
}

async function loadAllItems(
  categories: MenuCategory[],
  options: { categoryId?: string; includeInactive?: boolean } = {},
) {
  const includeInactive = options.includeInactive === true;
  const byId = categoryMapById(categories);

  const rows = await db
    .select({
      id: menuItems.id,
      categoryId: menuItems.categoryId,
      name: menuItems.name,
      description: menuItems.description,
      imageLink: imagesMetadata.imageLink,
      basePrice: menuItems.basePrice,
      largePrice: menuItems.largePrice,
      familyPrice: menuItems.familyPrice,
      imageFocalX: menuItems.imageFocalX,
      imageFocalY: menuItems.imageFocalY,
      prepMinutes: menuItems.prepMinutes,
      isActive: menuItems.isActive,
      updatedAt: menuItems.updatedAt,
    })
    .from(menuItems)
    .leftJoin(imagesMetadata, eq(menuItems.imageMetadataId, imagesMetadata.id));

  const items: DbMenuItem[] = [];
  for (const row of rows) {
    const category = byId.get(row.categoryId);
    if (!category || !supportsCategory(options.categoryId, row.categoryId)) continue;
    if (!includeInactive && (!category.isActive || !row.isActive)) continue;
    items.push(rowToDbMenuItem(row, category));
  }
  return items;
}

async function findItemById(itemId: string): Promise<DbMenuItem | null> {
  const categories = await listAllCategories();
  const byId = categoryMapById(categories);

  const rows = await db
    .select({
      id: menuItems.id,
      categoryId: menuItems.categoryId,
      name: menuItems.name,
      description: menuItems.description,
      imageLink: imagesMetadata.imageLink,
      basePrice: menuItems.basePrice,
      largePrice: menuItems.largePrice,
      familyPrice: menuItems.familyPrice,
      imageFocalX: menuItems.imageFocalX,
      imageFocalY: menuItems.imageFocalY,
      prepMinutes: menuItems.prepMinutes,
      isActive: menuItems.isActive,
      updatedAt: menuItems.updatedAt,
    })
    .from(menuItems)
    .leftJoin(imagesMetadata, eq(menuItems.imageMetadataId, imagesMetadata.id))
    .where(eq(menuItems.id, itemId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  const category = byId.get(row.categoryId);
  if (!category) return null;
  return rowToDbMenuItem(row, category);
}

async function countItemsByCategoryId() {
  const rows = await db
    .select({
      categoryId: menuItems.categoryId,
      total: sql<number>`count(*)`,
    })
    .from(menuItems)
    .groupBy(menuItems.categoryId);

  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.categoryId, Number(row.total));
  return counts;
}

async function ensureCategory(categoryId: string) {
  const categories = await listAllCategories();
  const category = categories.find((c) => c.id === categoryId);
  if (!category) {
    throw new MenuValidationError("Category not found.", 404, "CATEGORY_NOT_FOUND");
  }
  return category;
}

// ---------------------------------------------------------------------------
// Public DB functions
// ---------------------------------------------------------------------------

export async function listPublicMenuFromDb({
  search = "",
  categoryId,
}: {
  search?: string;
  categoryId?: string;
} = {}): Promise<PublicMenuResponse> {
  const normalizedSearch = normalizeSearch(search);
  const categories = (await listAllCategories()).filter((c) => c.isActive);

  const items = (await loadAllItems(categories, { categoryId, includeInactive: true }))
    .filter((item) => matchSearch(item, normalizedSearch))
    .sort(sortByCategoryThenPriceThenName)
    .map(toPublicItem);

  return {
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
    })),
    items,
    search: String(search || "").trim(),
  };
}

export async function getPublicItemDetailFromDb(itemId: string): Promise<PublicItemDetail> {
  const normalized = String(itemId || "").trim();
  if (!normalized) {
    throw new MenuValidationError("Menu item not found.", 404, "ITEM_NOT_FOUND");
  }

  const categories = (await listAllCategories()).filter((c) => c.isActive);
  const items = await loadAllItems(categories, { includeInactive: false });
  const match = items.find((item) => item.id === normalized);
  if (!match) {
    throw new MenuValidationError("Menu item not found.", 404, "ITEM_NOT_FOUND");
  }
  return toPublicDetail(match);
}

export async function listAdminCategoriesFromDb({ search = "", page = 1, pageSize = 10 } = {}) {
  const normalizedSearch = normalizeSearch(search);
  const categories = await listAllCategories();
  const counts = await countItemsByCategoryId();

  const filtered = categories
    .filter((c) => (normalizedSearch ? c.name.toLowerCase().includes(normalizedSearch) : true))
    .map((c) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      updatedAt: c.updatedAt,
      itemCount: counts.get(c.id) || 0,
    }))
    .sort((a, b) =>
      a.sortOrder !== b.sortOrder ? a.sortOrder - b.sortOrder : a.name.localeCompare(b.name),
    );

  return paginate(filtered, page, pageSize);
}

export async function createCategoryInDb(input: {
  name: string;
  sortOrder: number;
  isActive: boolean;
}) {
  const categories = await listAllCategories();
  const duplicateName = categories.find(
    (c) => c.name.toLowerCase() === input.name.toLowerCase(),
  );
  if (duplicateName) {
    throw new MenuValidationError("Category with this name already exists.", 409, "CATEGORY_EXISTS");
  }

  const baseSlug = toId(input.name);
  let slug = baseSlug;
  let suffix = 2;
  while (categories.some((c) => c.slug === slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  let next = 1;
  for (const c of categories) {
    const matched = /^cat-(\d+)$/.exec(c.id);
    if (!matched) continue;
    const numeric = Number.parseInt(matched[1], 10);
    if (Number.isFinite(numeric) && numeric >= next) next = numeric + 1;
  }
  const id = `cat-${String(next).padStart(3, "0")}`;

  await db.insert(menuCategories).values({
    id,
    slug,
    name: input.name,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
  });

  return {
    id,
    name: input.name,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
    updatedAt: new Date().toISOString(),
    itemCount: 0,
  } satisfies AdminCategory;
}

export async function updateCategoryInDb(
  categoryId: string,
  patch: { name?: string; sortOrder?: number; isActive?: boolean },
) {
  const categories = await listAllCategories();
  const current = categories.find((c) => c.id === categoryId);
  if (!current) {
    throw new MenuValidationError("Category not found.", 404, "CATEGORY_NOT_FOUND");
  }

  const nextName = patch.name ?? current.name;
  const nextSortOrder = patch.sortOrder ?? current.sortOrder;
  const nextIsActive = patch.isActive ?? current.isActive;

  const duplicate = categories.find(
    (c) => c.id !== categoryId && c.name.toLowerCase() === nextName.toLowerCase(),
  );
  if (duplicate) {
    throw new MenuValidationError("Category with this name already exists.", 409, "CATEGORY_EXISTS");
  }

  let slug = current.slug;
  if (patch.name && patch.name !== current.name) {
    const baseSlug = toId(nextName);
    slug = baseSlug;
    let sfx = 2;
    while (categories.some((c) => c.id !== categoryId && c.slug === slug)) {
      slug = `${baseSlug}-${sfx}`;
      sfx += 1;
    }
  }

  await db
    .update(menuCategories)
    .set({
      name: nextName,
      slug,
      sortOrder: nextSortOrder,
      isActive: nextIsActive,
      updatedAt: sql`CURRENT_TIMESTAMP(3)`,
    })
    .where(eq(menuCategories.id, categoryId));

  const counts = await countItemsByCategoryId();
  return {
    id: categoryId,
    name: nextName,
    sortOrder: nextSortOrder,
    isActive: nextIsActive,
    updatedAt: new Date().toISOString(),
    itemCount: counts.get(categoryId) || 0,
  } satisfies AdminCategory;
}

export async function deleteCategoryInDb(categoryId: string) {
  await ensureCategory(categoryId);

  const rows = await db
    .select({ total: sql<number>`count(*)` })
    .from(menuItems)
    .where(eq(menuItems.categoryId, categoryId));
  const count = Number(rows[0]?.total || 0);

  if (count > 0) {
    throw new MenuValidationError(
      "Cannot delete category with existing menu items.",
      409,
      "CATEGORY_NOT_EMPTY",
    );
  }

  await db.delete(menuCategories).where(eq(menuCategories.id, categoryId));
}

export async function listAdminItemsFromDb({
  search = "",
  categoryId,
  page = 1,
  pageSize = 10,
}: {
  search?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const normalizedSearch = normalizeSearch(search);
  const categories = await listAllCategories();
  const items = (await loadAllItems(categories, { categoryId, includeInactive: true }))
    .filter((item) => (normalizedSearch ? matchSearch(item, normalizedSearch) : true))
    .sort(sortByCategoryThenPriceThenName)
    .map(toAdminItem);
  return paginate(items, page, pageSize);
}

export async function getAdminItemDetailFromDb(itemId: string) {
  const item = await findItemById(itemId);
  if (!item) {
    throw new MenuValidationError("Menu item not found.", 404, "ITEM_NOT_FOUND");
  }
  return toAdminItem(item);
}

export async function createItemInDb(input: {
  categoryId: string;
  name: string;
  description: string;
  imageUrls: string[];
  basePrice: number;
  isActive: boolean;
  prepMinutes: number;
  focalX?: number;
  focalY?: number;
}) {
  const category = await ensureCategory(input.categoryId);
  const id = createItemId();
  const imageMetadataId = await resolveImageMetadataId(input.imageUrls);
  const isDualPrice = category.slug === "pizzat";
  const focalX = input.focalX !== undefined ? input.focalX.toFixed(2) : null;
  const focalY = input.focalY !== undefined ? input.focalY.toFixed(2) : null;

  if (isDualPrice) {
    const rows = await db
      .select({ maxMenuNumber: sql<number>`COALESCE(MAX(${menuItems.menuNumber}), 0)` })
      .from(menuItems)
      .where(eq(menuItems.categoryId, category.id));
    const maxMenuNumber = Number(rows[0]?.maxMenuNumber || 0);

    await db.insert(menuItems).values({
      id,
      categoryId: category.id,
      menuNumber: maxMenuNumber + 1,
      name: input.name,
      description: input.description || null,
      imageMetadataId: imageMetadataId ?? null,
      basePrice: null,
      largePrice: input.basePrice.toFixed(2),
      familyPrice: input.basePrice.toFixed(2),
      imageFocalX: focalX,
      imageFocalY: focalY,
      prepMinutes: input.prepMinutes,
      isActive: input.isActive,
    });
  } else {
    await db.insert(menuItems).values({
      id,
      categoryId: category.id,
      menuNumber: null,
      name: input.name,
      description: input.description || null,
      imageMetadataId: imageMetadataId ?? null,
      basePrice: input.basePrice.toFixed(2),
      largePrice: null,
      familyPrice: null,
      imageFocalX: focalX,
      imageFocalY: focalY,
      prepMinutes: input.prepMinutes,
      isActive: input.isActive,
    });
  }

  return getAdminItemDetailFromDb(id);
}

export async function updateItemInDb(
  itemId: string,
  patch: {
    categoryId?: string;
    name?: string;
    description?: string;
    imageUrls?: string[];
    basePrice?: number;
    familyPrice?: number;
    isActive?: boolean;
    prepMinutes?: number;
    focalX?: number | null;
    focalY?: number | null;
  },
) {
  const current = await findItemById(itemId);
  if (!current) {
    throw new MenuValidationError("Menu item not found.", 404, "ITEM_NOT_FOUND");
  }

  let targetCategoryId = current.categoryId;
  if (patch.categoryId && patch.categoryId !== current.categoryId) {
    await ensureCategory(patch.categoryId);
    targetCategoryId = patch.categoryId;
  }

  const nextImageMetadataId = await resolveImageMetadataId(patch.imageUrls);
  const isDualPrice = current.familyPrice !== null;
  const nextFocalX =
    "focalX" in patch
      ? patch.focalX !== null && patch.focalX !== undefined
        ? patch.focalX.toFixed(2)
        : null
      : undefined;
  const nextFocalY =
    "focalY" in patch
      ? patch.focalY !== null && patch.focalY !== undefined
        ? patch.focalY.toFixed(2)
        : null
      : undefined;

  if (isDualPrice) {
    const nextLarge = patch.basePrice !== undefined ? patch.basePrice : current.basePrice;
    const requestedFamily =
      patch.familyPrice !== undefined ? patch.familyPrice : current.familyPrice || nextLarge;
    const nextFamily = Math.max(requestedFamily, nextLarge);

    await db
      .update(menuItems)
      .set({
        categoryId: targetCategoryId,
        name: patch.name,
        description: patch.description,
        imageMetadataId: nextImageMetadataId,
        largePrice: patch.basePrice !== undefined ? nextLarge.toFixed(2) : undefined,
        familyPrice:
          patch.basePrice !== undefined || patch.familyPrice !== undefined
            ? nextFamily.toFixed(2)
            : undefined,
        imageFocalX: nextFocalX,
        imageFocalY: nextFocalY,
        isActive: patch.isActive,
        prepMinutes: patch.prepMinutes,
        updatedAt: sql`CURRENT_TIMESTAMP(3)`,
      })
      .where(eq(menuItems.id, itemId));
  } else {
    await db
      .update(menuItems)
      .set({
        categoryId: targetCategoryId,
        name: patch.name,
        description: patch.description,
        imageMetadataId: nextImageMetadataId,
        basePrice: patch.basePrice !== undefined ? patch.basePrice.toFixed(2) : undefined,
        imageFocalX: nextFocalX,
        imageFocalY: nextFocalY,
        isActive: patch.isActive,
        prepMinutes: patch.prepMinutes,
        updatedAt: sql`CURRENT_TIMESTAMP(3)`,
      })
      .where(eq(menuItems.id, itemId));
  }

  return getAdminItemDetailFromDb(itemId);
}

export async function deleteItemInDb(itemId: string) {
  const current = await findItemById(itemId);
  if (!current) {
    throw new MenuValidationError("Menu item not found.", 404, "ITEM_NOT_FOUND");
  }
  await db.delete(menuItems).where(eq(menuItems.id, itemId));
}

export async function createModifierGroupInDb(...args: unknown[]) {
  void args;
  throw new MenuValidationError(
    "Modifier groups are not yet supported.",
    400,
    "MODIFIERS_NOT_SUPPORTED",
  );
}

export async function updateModifierGroupInDb(...args: unknown[]) {
  void args;
  throw new MenuValidationError(
    "Modifier groups are not yet supported.",
    400,
    "MODIFIERS_NOT_SUPPORTED",
  );
}

export async function deleteModifierGroupInDb(...args: unknown[]) {
  void args;
  throw new MenuValidationError(
    "Modifier groups are not yet supported.",
    400,
    "MODIFIERS_NOT_SUPPORTED",
  );
}

export async function createModifierOptionInDb(...args: unknown[]) {
  void args;
  throw new MenuValidationError(
    "Modifier options are not yet supported.",
    400,
    "MODIFIERS_NOT_SUPPORTED",
  );
}

export async function updateModifierOptionInDb(...args: unknown[]) {
  void args;
  throw new MenuValidationError(
    "Modifier options are not yet supported.",
    400,
    "MODIFIERS_NOT_SUPPORTED",
  );
}

export async function deleteModifierOptionInDb(...args: unknown[]) {
  void args;
  throw new MenuValidationError(
    "Modifier options are not yet supported.",
    400,
    "MODIFIERS_NOT_SUPPORTED",
  );
}

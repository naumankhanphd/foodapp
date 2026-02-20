import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  drinkMenuItems,
  imagesMetadata,
  kebabitMenuItems,
  menuCategories,
  pizzaMenuItems,
  salaatitMenuItems,
  starterMenuItems,
} from "@/lib/db/menu-schema";
import { MenuValidationError } from "./validation.mjs";

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

type ItemSource = "starters" | "kebabit" | "salaatit" | "drinks" | "pizzat";

type DbMenuItem = {
  id: string;
  source: ItemSource;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  categorySortOrder: number;
  name: string;
  description: string;
  imageUrls: string[];
  basePrice: number;
  familyPrice: number | null;
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
  if (!trimmed) {
    return null;
  }
  if (isAbsoluteImageUrl(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
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
  if (!raw) {
    return [];
  }
  if (isAbsoluteImageUrl(raw)) {
    return [raw];
  }
  if (raw.startsWith("//")) {
    return [`https:${raw}`];
  }
  if (raw.startsWith("/") && ASSET_BASE_URL) {
    return [`${ASSET_BASE_URL}${raw}`];
  }
  return [raw.startsWith("/") ? raw : `/${raw}`];
}

function inferImageType(imageName: string) {
  const lower = imageName.split("?")[0].split("#")[0].toLowerCase();
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }
  if (lower.endsWith(".gif")) {
    return "image/gif";
  }
  if (lower.endsWith(".avif")) {
    return "image/avif";
  }
  return "image/jpeg";
}

async function resolveImageMetadataId(imageUrls: string[] | undefined): Promise<number | null | undefined> {
  if (imageUrls === undefined) {
    return undefined;
  }

  const firstLink = normalizeImageLink(imageUrls[0] || "");
  if (!firstLink) {
    return null;
  }

  const [existing] = await db
    .select({ id: imagesMetadata.id })
    .from(imagesMetadata)
    .where(eq(imagesMetadata.imageLink, firstLink))
    .limit(1);

  if (existing?.id) {
    return existing.id;
  }

  const imageName = toImageNameFromLink(firstLink);
  const insertResult = await db.insert(imagesMetadata).values({
    imageName,
    imageLink: firstLink,
    imageHeight: null,
    imageWidth: null,
    imageType: inferImageType(imageName),
  });

  const insertId = Number((insertResult as { insertId?: unknown }).insertId);
  if (Number.isFinite(insertId) && insertId > 0) {
    return insertId;
  }

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
        {
          id: `opt-${itemId}-large`,
          name: "Large",
          priceDelta: 0,
          isActive: true,
        },
        {
          id: `opt-${itemId}-family`,
          name: "Family",
          priceDelta: delta,
          isActive: true,
        },
      ],
    },
  ];
}

function toModifierGroups(item: DbMenuItem) {
  if (item.familyPrice === null) {
    return [];
  }
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
    category: {
      id: item.categoryId,
      name: item.categoryName,
    },
    modifierGroups: toModifierGroups(item),
  };
}

function matchSearch(item: DbMenuItem, normalizedSearch: string) {
  if (!normalizedSearch) {
    return true;
  }
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
  for (const category of categories) {
    map.set(category.id, category);
  }
  return map;
}

function supportsCategory(targetCategoryId: string | undefined, categoryId: string) {
  if (!targetCategoryId) {
    return true;
  }
  return targetCategoryId === categoryId;
}

async function loadAllItems(categories: MenuCategory[], options: { categoryId?: string; includeInactive?: boolean } = {}) {
  const includeInactive = options.includeInactive === true;
  const byId = categoryMapById(categories);

  const [starterRows, kebabitRows, salaatitRows, drinkRows, pizzaRows] = await Promise.all([
    db
      .select({
        id: starterMenuItems.id,
        categoryId: starterMenuItems.categoryId,
        name: starterMenuItems.name,
        description: starterMenuItems.description,
        imageLink: imagesMetadata.imageLink,
        price: starterMenuItems.price,
        prepMinutes: starterMenuItems.prepMinutes,
        isActive: starterMenuItems.isActive,
        updatedAt: starterMenuItems.updatedAt,
      })
      .from(starterMenuItems)
      .leftJoin(imagesMetadata, eq(starterMenuItems.imageMetadataId, imagesMetadata.id)),
    db
      .select({
        id: kebabitMenuItems.id,
        categoryId: kebabitMenuItems.categoryId,
        name: kebabitMenuItems.name,
        imageLink: imagesMetadata.imageLink,
        price: kebabitMenuItems.price,
        prepMinutes: kebabitMenuItems.prepMinutes,
        isActive: kebabitMenuItems.isActive,
        updatedAt: kebabitMenuItems.updatedAt,
      })
      .from(kebabitMenuItems)
      .leftJoin(imagesMetadata, eq(kebabitMenuItems.imageMetadataId, imagesMetadata.id)),
    db
      .select({
        id: salaatitMenuItems.id,
        categoryId: salaatitMenuItems.categoryId,
        name: salaatitMenuItems.name,
        description: salaatitMenuItems.description,
        imageLink: imagesMetadata.imageLink,
        price: salaatitMenuItems.price,
        prepMinutes: salaatitMenuItems.prepMinutes,
        isActive: salaatitMenuItems.isActive,
        updatedAt: salaatitMenuItems.updatedAt,
      })
      .from(salaatitMenuItems)
      .leftJoin(imagesMetadata, eq(salaatitMenuItems.imageMetadataId, imagesMetadata.id)),
    db
      .select({
        id: drinkMenuItems.id,
        categoryId: drinkMenuItems.categoryId,
        name: drinkMenuItems.name,
        description: drinkMenuItems.description,
        imageLink: imagesMetadata.imageLink,
        price: drinkMenuItems.price,
        prepMinutes: drinkMenuItems.prepMinutes,
        isActive: drinkMenuItems.isActive,
        updatedAt: drinkMenuItems.updatedAt,
      })
      .from(drinkMenuItems)
      .leftJoin(imagesMetadata, eq(drinkMenuItems.imageMetadataId, imagesMetadata.id)),
    db
      .select({
        id: pizzaMenuItems.id,
        categoryId: pizzaMenuItems.categoryId,
        name: pizzaMenuItems.name,
        description: pizzaMenuItems.description,
        imageLink: imagesMetadata.imageLink,
        largePrice: pizzaMenuItems.largePrice,
        familyPrice: pizzaMenuItems.familyPrice,
        prepMinutes: pizzaMenuItems.prepMinutes,
        isActive: pizzaMenuItems.isActive,
        updatedAt: pizzaMenuItems.updatedAt,
      })
      .from(pizzaMenuItems)
      .leftJoin(imagesMetadata, eq(pizzaMenuItems.imageMetadataId, imagesMetadata.id)),
  ]);

  const items: DbMenuItem[] = [];

  for (const row of starterRows) {
    const category = byId.get(row.categoryId);
    if (!category || !supportsCategory(options.categoryId, row.categoryId)) {
      continue;
    }
    if (!includeInactive && (!category.isActive || !row.isActive)) {
      continue;
    }
    items.push({
      id: row.id,
      source: "starters",
      categoryId: row.categoryId,
      categorySlug: category.slug,
      categoryName: category.name,
      categorySortOrder: category.sortOrder,
      name: row.name,
      description: row.description,
      imageUrls: toPublicImageUrls(row.imageLink),
      basePrice: toNumber(row.price),
      familyPrice: null,
      prepMinutes: row.prepMinutes,
      isActive: row.isActive,
      updatedAt: row.updatedAt,
    });
  }

  for (const row of kebabitRows) {
    const category = byId.get(row.categoryId);
    if (!category || !supportsCategory(options.categoryId, row.categoryId)) {
      continue;
    }
    if (!includeInactive && (!category.isActive || !row.isActive)) {
      continue;
    }
    items.push({
      id: row.id,
      source: "kebabit",
      categoryId: row.categoryId,
      categorySlug: category.slug,
      categoryName: category.name,
      categorySortOrder: category.sortOrder,
      name: row.name,
      description: "",
      imageUrls: toPublicImageUrls(row.imageLink),
      basePrice: toNumber(row.price),
      familyPrice: null,
      prepMinutes: row.prepMinutes,
      isActive: row.isActive,
      updatedAt: row.updatedAt,
    });
  }

  for (const row of salaatitRows) {
    const category = byId.get(row.categoryId);
    if (!category || !supportsCategory(options.categoryId, row.categoryId)) {
      continue;
    }
    if (!includeInactive && (!category.isActive || !row.isActive)) {
      continue;
    }
    items.push({
      id: row.id,
      source: "salaatit",
      categoryId: row.categoryId,
      categorySlug: category.slug,
      categoryName: category.name,
      categorySortOrder: category.sortOrder,
      name: row.name,
      description: row.description,
      imageUrls: toPublicImageUrls(row.imageLink),
      basePrice: toNumber(row.price),
      familyPrice: null,
      prepMinutes: row.prepMinutes,
      isActive: row.isActive,
      updatedAt: row.updatedAt,
    });
  }

  for (const row of drinkRows) {
    const category = byId.get(row.categoryId);
    if (!category || !supportsCategory(options.categoryId, row.categoryId)) {
      continue;
    }
    if (!includeInactive && (!category.isActive || !row.isActive)) {
      continue;
    }
    items.push({
      id: row.id,
      source: "drinks",
      categoryId: row.categoryId,
      categorySlug: category.slug,
      categoryName: category.name,
      categorySortOrder: category.sortOrder,
      name: row.name,
      description: row.description,
      imageUrls: toPublicImageUrls(row.imageLink),
      basePrice: toNumber(row.price),
      familyPrice: null,
      prepMinutes: row.prepMinutes,
      isActive: row.isActive,
      updatedAt: row.updatedAt,
    });
  }

  for (const row of pizzaRows) {
    const category = byId.get(row.categoryId);
    if (!category || !supportsCategory(options.categoryId, row.categoryId)) {
      continue;
    }
    if (!includeInactive && (!category.isActive || !row.isActive)) {
      continue;
    }
    items.push({
      id: row.id,
      source: "pizzat",
      categoryId: row.categoryId,
      categorySlug: category.slug,
      categoryName: category.name,
      categorySortOrder: category.sortOrder,
      name: row.name,
      description: row.description,
      imageUrls: toPublicImageUrls(row.imageLink),
      basePrice: toNumber(row.largePrice),
      familyPrice: toNumber(row.familyPrice),
      prepMinutes: row.prepMinutes,
      isActive: row.isActive,
      updatedAt: row.updatedAt,
    });
  }

  return items;
}

function assertModifierUnsupported() {
  throw new MenuValidationError(
    "Modifier groups/options are not supported with the current DB menu schema.",
    400,
    "MODIFIERS_NOT_SUPPORTED",
  );
}

async function ensureCategory(categoryId: string) {
  const categories = await listAllCategories();
  const category = categories.find((entry) => entry.id === categoryId);
  if (!category) {
    throw new MenuValidationError("Category not found.", 404, "CATEGORY_NOT_FOUND");
  }
  return category;
}

function toSupportedSource(category: MenuCategory): ItemSource {
  if (category.slug === "starters") {
    return "starters";
  }
  if (category.slug === "kebabit") {
    return "kebabit";
  }
  if (category.slug === "salaatit") {
    return "salaatit";
  }
  if (category.slug === "drinks") {
    return "drinks";
  }
  if (category.slug === "pizzat") {
    return "pizzat";
  }
  throw new MenuValidationError(
    `Category '${category.name}' is not mapped to a dedicated table in the redesigned menu schema.`,
    400,
    "CATEGORY_TABLE_NOT_SUPPORTED",
  );
}

async function findItemById(itemId: string) {
  const categories = await listAllCategories();
  const items = await loadAllItems(categories, { includeInactive: true });
  return items.find((entry) => entry.id === itemId) || null;
}

async function countItemsByCategoryId() {
  const categories = await listAllCategories();
  const items = await loadAllItems(categories, { includeInactive: true });
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.categoryId, (counts.get(item.categoryId) || 0) + 1);
  }
  return counts;
}

export async function listPublicMenuFromDb({
  search = "",
  categoryId,
}: {
  search?: string;
  categoryId?: string;
} = {}): Promise<PublicMenuResponse> {
  const normalizedSearch = normalizeSearch(search);
  const categories = (await listAllCategories()).filter((entry) => entry.isActive);

  const items = (await loadAllItems(categories, { categoryId, includeInactive: true }))
    .filter((item) => matchSearch(item, normalizedSearch))
    .sort(sortByCategoryThenPriceThenName)
    .map(toPublicItem);

  return {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
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

  const categories = (await listAllCategories()).filter((entry) => entry.isActive);
  const items = await loadAllItems(categories, { includeInactive: false });
  const match = items.find((entry) => entry.id === normalized);
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
    .filter((category) => (normalizedSearch ? category.name.toLowerCase().includes(normalizedSearch) : true))
    .map((category) => ({
      id: category.id,
      name: category.name,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      updatedAt: category.updatedAt,
      itemCount: counts.get(category.id) || 0,
    }))
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }
      return left.name.localeCompare(right.name);
    });

  return paginate(filtered, page, pageSize);
}

export async function createCategoryInDb(input: { name: string; sortOrder: number; isActive: boolean }) {
  const categories = await listAllCategories();
  const duplicateName = categories.find((entry) => entry.name.toLowerCase() === input.name.toLowerCase());
  if (duplicateName) {
    throw new MenuValidationError("Category with this name already exists.", 409, "CATEGORY_EXISTS");
  }

  const baseSlug = toId(input.name);
  let slug = baseSlug;
  let suffix = 2;
  while (categories.some((entry) => entry.slug === slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  let next = 1;
  for (const category of categories) {
    const matched = /^cat-(\d+)$/.exec(category.id);
    if (!matched) {
      continue;
    }
    const numeric = Number.parseInt(matched[1], 10);
    if (Number.isFinite(numeric) && numeric >= next) {
      next = numeric + 1;
    }
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

export async function updateCategoryInDb(categoryId: string, patch: { name?: string; sortOrder?: number; isActive?: boolean }) {
  const categories = await listAllCategories();
  const current = categories.find((entry) => entry.id === categoryId);
  if (!current) {
    throw new MenuValidationError("Category not found.", 404, "CATEGORY_NOT_FOUND");
  }

  const nextName = patch.name ?? current.name;
  const nextSortOrder = patch.sortOrder ?? current.sortOrder;
  const nextIsActive = patch.isActive ?? current.isActive;

  const duplicate = categories.find(
    (entry) => entry.id !== categoryId && entry.name.toLowerCase() === nextName.toLowerCase(),
  );
  if (duplicate) {
    throw new MenuValidationError("Category with this name already exists.", 409, "CATEGORY_EXISTS");
  }

  let slug = current.slug;
  if (patch.name && patch.name !== current.name) {
    const baseSlug = toId(nextName);
    slug = baseSlug;
    let suffix = 2;
    while (categories.some((entry) => entry.id !== categoryId && entry.slug === slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
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
  const category = await ensureCategory(categoryId);
  const source = toSupportedSource(category);

  let count = 0;
  if (source === "starters") {
    const rows = await db
      .select({ total: sql<number>`count(*)` })
      .from(starterMenuItems)
      .where(eq(starterMenuItems.categoryId, categoryId));
    count = Number(rows[0]?.total || 0);
  }
  if (source === "kebabit") {
    const rows = await db
      .select({ total: sql<number>`count(*)` })
      .from(kebabitMenuItems)
      .where(eq(kebabitMenuItems.categoryId, categoryId));
    count = Number(rows[0]?.total || 0);
  }
  if (source === "salaatit") {
    const rows = await db
      .select({ total: sql<number>`count(*)` })
      .from(salaatitMenuItems)
      .where(eq(salaatitMenuItems.categoryId, categoryId));
    count = Number(rows[0]?.total || 0);
  }
  if (source === "drinks") {
    const rows = await db
      .select({ total: sql<number>`count(*)` })
      .from(drinkMenuItems)
      .where(eq(drinkMenuItems.categoryId, categoryId));
    count = Number(rows[0]?.total || 0);
  }
  if (source === "pizzat") {
    const rows = await db
      .select({ total: sql<number>`count(*)` })
      .from(pizzaMenuItems)
      .where(eq(pizzaMenuItems.categoryId, categoryId));
    count = Number(rows[0]?.total || 0);
  }

  if (count > 0) {
    throw new MenuValidationError("Cannot delete category with existing menu items.", 409, "CATEGORY_NOT_EMPTY");
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
}) {
  const category = await ensureCategory(input.categoryId);
  const source = toSupportedSource(category);
  const id = createItemId();
  const imageMetadataId = await resolveImageMetadataId(input.imageUrls);

  if (source === "starters") {
    await db.insert(starterMenuItems).values({
      id,
      categoryId: category.id,
      name: input.name,
      description: input.description,
      imageMetadataId: imageMetadataId ?? null,
      price: input.basePrice.toFixed(2),
      prepMinutes: input.prepMinutes,
      isActive: input.isActive,
    });
  }

  if (source === "kebabit") {
    await db.insert(kebabitMenuItems).values({
      id,
      categoryId: category.id,
      name: input.name,
      imageMetadataId: imageMetadataId ?? null,
      price: input.basePrice.toFixed(2),
      prepMinutes: input.prepMinutes,
      isActive: input.isActive,
    });
  }

  if (source === "salaatit") {
    await db.insert(salaatitMenuItems).values({
      id,
      categoryId: category.id,
      name: input.name,
      description: input.description,
      imageMetadataId: imageMetadataId ?? null,
      price: input.basePrice.toFixed(2),
      prepMinutes: input.prepMinutes,
      isActive: input.isActive,
    });
  }

  if (source === "drinks") {
    await db.insert(drinkMenuItems).values({
      id,
      categoryId: category.id,
      name: input.name,
      description: input.description,
      imageMetadataId: imageMetadataId ?? null,
      price: input.basePrice.toFixed(2),
      prepMinutes: input.prepMinutes,
      isActive: input.isActive,
    });
  }

  if (source === "pizzat") {
    const rows = await db
      .select({ maxMenuNumber: sql<number>`COALESCE(MAX(${pizzaMenuItems.menuNumber}), 0)` })
      .from(pizzaMenuItems)
      .where(eq(pizzaMenuItems.categoryId, category.id));
    const maxMenuNumber = Number(rows[0]?.maxMenuNumber || 0);

    await db.insert(pizzaMenuItems).values({
      id,
      categoryId: category.id,
      menuNumber: maxMenuNumber + 1,
      name: input.name,
      description: input.description,
      imageMetadataId: imageMetadataId ?? null,
      largePrice: input.basePrice.toFixed(2),
      familyPrice: input.basePrice.toFixed(2),
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
  },
) {
  const current = await findItemById(itemId);
  if (!current) {
    throw new MenuValidationError("Menu item not found.", 404, "ITEM_NOT_FOUND");
  }

  let targetCategoryId = current.categoryId;
  if (patch.categoryId && patch.categoryId !== current.categoryId) {
    const targetCategory = await ensureCategory(patch.categoryId);
    const targetSource = toSupportedSource(targetCategory);
    if (targetSource !== current.source) {
      throw new MenuValidationError(
        "Moving item across category tables is not supported. Create a new item in the target category.",
        400,
        "ITEM_MOVE_NOT_SUPPORTED",
      );
    }
    targetCategoryId = patch.categoryId;
  }
  const nextImageMetadataId = await resolveImageMetadataId(patch.imageUrls);

  if (current.source === "starters") {
    await db
      .update(starterMenuItems)
      .set({
        categoryId: targetCategoryId,
        name: patch.name,
        description: patch.description,
        imageMetadataId: nextImageMetadataId,
        price: patch.basePrice !== undefined ? patch.basePrice.toFixed(2) : undefined,
        isActive: patch.isActive,
        prepMinutes: patch.prepMinutes,
        updatedAt: sql`CURRENT_TIMESTAMP(3)`,
      })
      .where(eq(starterMenuItems.id, itemId));
  }

  if (current.source === "kebabit") {
    await db
      .update(kebabitMenuItems)
      .set({
        categoryId: targetCategoryId,
        name: patch.name,
        imageMetadataId: nextImageMetadataId,
        price: patch.basePrice !== undefined ? patch.basePrice.toFixed(2) : undefined,
        isActive: patch.isActive,
        prepMinutes: patch.prepMinutes,
        updatedAt: sql`CURRENT_TIMESTAMP(3)`,
      })
      .where(eq(kebabitMenuItems.id, itemId));
  }

  if (current.source === "salaatit") {
    await db
      .update(salaatitMenuItems)
      .set({
        categoryId: targetCategoryId,
        name: patch.name,
        description: patch.description,
        imageMetadataId: nextImageMetadataId,
        price: patch.basePrice !== undefined ? patch.basePrice.toFixed(2) : undefined,
        isActive: patch.isActive,
        prepMinutes: patch.prepMinutes,
        updatedAt: sql`CURRENT_TIMESTAMP(3)`,
      })
      .where(eq(salaatitMenuItems.id, itemId));
  }

  if (current.source === "drinks") {
    await db
      .update(drinkMenuItems)
      .set({
        categoryId: targetCategoryId,
        name: patch.name,
        description: patch.description,
        imageMetadataId: nextImageMetadataId,
        price: patch.basePrice !== undefined ? patch.basePrice.toFixed(2) : undefined,
        isActive: patch.isActive,
        prepMinutes: patch.prepMinutes,
        updatedAt: sql`CURRENT_TIMESTAMP(3)`,
      })
      .where(eq(drinkMenuItems.id, itemId));
  }

  if (current.source === "pizzat") {
    const nextLarge = patch.basePrice !== undefined ? patch.basePrice : current.basePrice;
    const requestedFamily =
      patch.familyPrice !== undefined ? patch.familyPrice : current.familyPrice || nextLarge;
    const nextFamily = Math.max(requestedFamily, nextLarge);

    await db
      .update(pizzaMenuItems)
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
        isActive: patch.isActive,
        prepMinutes: patch.prepMinutes,
        updatedAt: sql`CURRENT_TIMESTAMP(3)`,
      })
      .where(eq(pizzaMenuItems.id, itemId));
  }

  return getAdminItemDetailFromDb(itemId);
}

export async function deleteItemInDb(itemId: string) {
  const current = await findItemById(itemId);
  if (!current) {
    throw new MenuValidationError("Menu item not found.", 404, "ITEM_NOT_FOUND");
  }

  if (current.source === "starters") {
    await db.delete(starterMenuItems).where(eq(starterMenuItems.id, itemId));
    return;
  }
  if (current.source === "kebabit") {
    await db.delete(kebabitMenuItems).where(eq(kebabitMenuItems.id, itemId));
    return;
  }
  if (current.source === "salaatit") {
    await db.delete(salaatitMenuItems).where(eq(salaatitMenuItems.id, itemId));
    return;
  }
  if (current.source === "drinks") {
    await db.delete(drinkMenuItems).where(eq(drinkMenuItems.id, itemId));
    return;
  }
  await db.delete(pizzaMenuItems).where(eq(pizzaMenuItems.id, itemId));
}

export async function createModifierGroupInDb(...args: unknown[]) {
  void args;
  assertModifierUnsupported();
}

export async function updateModifierGroupInDb(...args: unknown[]) {
  void args;
  assertModifierUnsupported();
}

export async function deleteModifierGroupInDb(...args: unknown[]) {
  void args;
  assertModifierUnsupported();
}

export async function createModifierOptionInDb(...args: unknown[]) {
  void args;
  assertModifierUnsupported();
}

export async function updateModifierOptionInDb(...args: unknown[]) {
  void args;
  assertModifierUnsupported();
}

export async function deleteModifierOptionInDb(...args: unknown[]) {
  void args;
  assertModifierUnsupported();
}

import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  datetime,
  decimal,
  index,
  int,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

const createdAt = datetime("created_at", { mode: "string", fsp: 3 })
  .notNull()
  .default(sql`CURRENT_TIMESTAMP(3)`);

const updatedAt = datetime("updated_at", { mode: "string", fsp: 3 })
  .notNull()
  .default(sql`CURRENT_TIMESTAMP(3)`);

export const menuCategories = mysqlTable(
  "menu_categories",
  {
    id: varchar("id", { length: 40 }).primaryKey(),
    slug: varchar("slug", { length: 40 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    sortOrder: int("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("uq_menu_categories_slug").on(table.slug),
    uniqueIndex("uq_menu_categories_name").on(table.name),
    index("idx_menu_categories_sort_name").on(table.sortOrder, table.name),
  ],
);

export const imagesMetadata = mysqlTable(
  "images_metadata",
  {
    id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
    imageName: varchar("image_name", { length: 191 }).notNull(),
    imageLink: text("image_link"),
    imageHeight: int("image_height"),
    imageWidth: int("image_width"),
    imageType: varchar("image_type", { length: 80 }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("idx_images_metadata_type").on(table.imageType),
    check(
      "chk_images_metadata_height_non_negative",
      sql`${table.imageHeight} IS NULL OR ${table.imageHeight} >= 0`,
    ),
    check(
      "chk_images_metadata_width_non_negative",
      sql`${table.imageWidth} IS NULL OR ${table.imageWidth} >= 0`,
    ),
  ],
);

export const menuItems = mysqlTable(
  "menu_items",
  {
    id: varchar("id", { length: 40 }).primaryKey(),
    categoryId: varchar("category_id", { length: 40 })
      .notNull()
      .references(() => menuCategories.id, { onDelete: "restrict", onUpdate: "cascade" }),
    // Ordering number for categories that need it (e.g. pizzas). Multiple NULLs
    // are allowed by MySQL UNIQUE — non-ordered items simply leave this NULL.
    menuNumber: int("menu_number"),
    name: varchar("name", { length: 191 }).notNull(),
    description: text("description"),
    imageMetadataId: bigint("image_metadata_id", { mode: "number", unsigned: true }).references(
      () => imagesMetadata.id,
      { onDelete: "set null", onUpdate: "cascade" },
    ),
    // Standard items: basePrice set, largePrice/familyPrice NULL.
    // Dual-price items (pizzas): basePrice NULL, largePrice + familyPrice set.
    basePrice: decimal("base_price", { precision: 10, scale: 2 }),
    largePrice: decimal("large_price", { precision: 10, scale: 2 }),
    familyPrice: decimal("family_price", { precision: 10, scale: 2 }),
    prepMinutes: int("prep_minutes").notNull().default(10),
    isActive: boolean("is_active").notNull().default(true),
    // Focal point for image crop preview (0–100, maps to CSS object-position %).
    // NULL means use the default centred position (50% 50%).
    imageFocalX: decimal("image_focal_x", { precision: 5, scale: 2 }),
    imageFocalY: decimal("image_focal_y", { precision: 5, scale: 2 }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("uq_menu_items_category_number").on(table.categoryId, table.menuNumber),
    index("idx_menu_items_category_active").on(table.categoryId, table.isActive, table.name),
    check(
      "chk_menu_items_base_price_nn",
      sql`${table.basePrice} IS NULL OR ${table.basePrice} >= 0`,
    ),
    check(
      "chk_menu_items_large_price_nn",
      sql`${table.largePrice} IS NULL OR ${table.largePrice} >= 0`,
    ),
    check(
      "chk_menu_items_family_ge_large",
      sql`${table.familyPrice} IS NULL OR ${table.largePrice} IS NULL OR ${table.familyPrice} >= ${table.largePrice}`,
    ),
    check("chk_menu_items_prep_nn", sql`${table.prepMinutes} >= 0`),
  ],
);

// ---------------------------------------------------------------------------
// Cart tables
// ---------------------------------------------------------------------------

export const cartSessions = mysqlTable(
  "cart_sessions",
  {
    id:                  varchar("id", { length: 40 }).primaryKey(),
    ownerKey:            varchar("owner_key", { length: 160 }).notNull(),
    orderType:           varchar("order_type", { length: 30 }).notNull().default("DELIVERY"),
    deliveryAddressJson: text("delivery_address_json"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("uq_cart_sessions_owner_key").on(table.ownerKey),
  ],
);

export const cartItems = mysqlTable(
  "cart_items",
  {
    id:                      varchar("id", { length: 40 }).primaryKey(),
    cartSessionId:           varchar("cart_session_id", { length: 40 }).notNull()
      .references(() => cartSessions.id, { onDelete: "cascade" }),
    itemId:                  varchar("item_id", { length: 40 }).notNull(),
    quantity:                int("quantity").notNull().default(1),
    selectedOptionIdsJson:   varchar("selected_option_ids_json", { length: 2000 }).notNull().default("[]"),
    specialInstructions:     varchar("special_instructions", { length: 280 }).notNull().default(""),
    itemNameSnapshot:        varchar("item_name_snapshot", { length: 191 }).notNull().default(""),
    basePriceSnapshot:       decimal("base_price_snapshot", { precision: 10, scale: 2 }).notNull().default("0"),
    modifierTotalSnapshot:   decimal("modifier_total_snapshot", { precision: 10, scale: 2 }).notNull().default("0"),
    unitPriceSnapshot:       decimal("unit_price_snapshot", { precision: 10, scale: 2 }).notNull().default("0"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("idx_cart_items_session").on(table.cartSessionId),
    index("idx_cart_items_item").on(table.itemId),
  ],
);

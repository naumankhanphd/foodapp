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
  uniqueIndex,
  varchar,
  text,
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

const baseMenuColumns = {
  id: varchar("id", { length: 40 }).primaryKey(),
  categoryId: varchar("category_id", { length: 40 })
    .notNull()
    .references(() => menuCategories.id, { onDelete: "restrict", onUpdate: "cascade" }),
  name: varchar("name", { length: 191 }).notNull(),
  description: text("description").notNull(),
  imageMetadataId: bigint("image_metadata_id", { mode: "number", unsigned: true }).references(
    () => imagesMetadata.id,
    { onDelete: "set null", onUpdate: "cascade" },
  ),
  prepMinutes: int("prep_minutes").notNull().default(10),
  isActive: boolean("is_active").notNull().default(true),
  createdAt,
  updatedAt,
};

const { description, ...baseMenuColumnsNoDescription } = baseMenuColumns;
void description;

export const starterMenuItems = mysqlTable(
  "starter_menu_items",
  {
    ...baseMenuColumns,
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  },
  (table) => [
    check("chk_starter_menu_price_non_negative", sql`${table.price} >= 0`),
    check("chk_starter_menu_prep_non_negative", sql`${table.prepMinutes} >= 0`),
    index("idx_starter_menu_items_active_price_name").on(table.isActive, table.price, table.name),
  ],
);

export const kebabitMenuItems = mysqlTable(
  "kebabit_menu_items",
  {
    ...baseMenuColumnsNoDescription,
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  },
  (table) => [
    check("chk_kebabit_menu_price_non_negative", sql`${table.price} >= 0`),
    check("chk_kebabit_menu_prep_non_negative", sql`${table.prepMinutes} >= 0`),
    index("idx_kebabit_menu_items_active_price_name").on(table.isActive, table.price, table.name),
  ],
);

export const salaatitMenuItems = mysqlTable(
  "salaatit_menu_items",
  {
    ...baseMenuColumns,
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  },
  (table) => [
    check("chk_salaatit_menu_price_non_negative", sql`${table.price} >= 0`),
    check("chk_salaatit_menu_prep_non_negative", sql`${table.prepMinutes} >= 0`),
    index("idx_salaatit_menu_items_active_price_name").on(table.isActive, table.price, table.name),
  ],
);

export const drinkMenuItems = mysqlTable(
  "drink_menu_items",
  {
    ...baseMenuColumns,
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  },
  (table) => [
    check("chk_drink_menu_price_non_negative", sql`${table.price} >= 0`),
    check("chk_drink_menu_prep_non_negative", sql`${table.prepMinutes} >= 0`),
    index("idx_drink_menu_items_active_price_name").on(table.isActive, table.price, table.name),
  ],
);

export const pizzaMenuItems = mysqlTable(
  "pizza_menu_items",
  {
    id: varchar("id", { length: 40 }).primaryKey(),
    categoryId: varchar("category_id", { length: 40 })
      .notNull()
      .references(() => menuCategories.id, { onDelete: "restrict", onUpdate: "cascade" }),
    menuNumber: int("menu_number").notNull(),
    name: varchar("name", { length: 191 }).notNull(),
    description: text("description").notNull(),
    imageMetadataId: bigint("image_metadata_id", { mode: "number", unsigned: true }).references(
      () => imagesMetadata.id,
      { onDelete: "set null", onUpdate: "cascade" },
    ),
    largePrice: decimal("large_price", { precision: 10, scale: 2 }).notNull(),
    familyPrice: decimal("family_price", { precision: 10, scale: 2 }).notNull(),
    prepMinutes: int("prep_minutes").notNull().default(15),
    isActive: boolean("is_active").notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("uq_pizza_menu_items_number").on(table.categoryId, table.menuNumber),
    check("chk_pizza_menu_large_non_negative", sql`${table.largePrice} >= 0`),
    check("chk_pizza_menu_family_non_negative", sql`${table.familyPrice} >= 0`),
    check("chk_pizza_menu_family_ge_large", sql`${table.familyPrice} >= ${table.largePrice}`),
    check("chk_pizza_menu_prep_non_negative", sql`${table.prepMinutes} >= 0`),
    index("idx_pizza_menu_items_active_price_name").on(table.isActive, table.largePrice, table.name),
  ],
);

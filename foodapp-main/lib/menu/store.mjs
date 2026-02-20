import {
  createCategoryInDb,
  createItemInDb,
  createModifierGroupInDb,
  createModifierOptionInDb,
  deleteCategoryInDb,
  deleteItemInDb,
  deleteModifierGroupInDb,
  deleteModifierOptionInDb,
  getAdminItemDetailFromDb,
  getPublicItemDetailFromDb,
  listAdminCategoriesFromDb,
  listAdminItemsFromDb,
  listPublicMenuFromDb,
  updateCategoryInDb,
  updateItemInDb,
  updateModifierGroupInDb,
  updateModifierOptionInDb,
} from "./drizzle-menu.ts";

// Compatibility module: legacy store API now proxies to MySQL via Drizzle.

export function getMenuStore() {
  return {
    source: "mysql-drizzle",
  };
}

export function resetMenuStoreForTests() {
  return {
    source: "mysql-drizzle",
    note: "No in-memory menu seed remains. Use db:reset + db:migrate + db:seed for data reset.",
  };
}

export const listPublicMenu = listPublicMenuFromDb;
export const getPublicItemDetail = getPublicItemDetailFromDb;

export const listAdminCategories = listAdminCategoriesFromDb;
export const createCategory = createCategoryInDb;
export const updateCategory = updateCategoryInDb;
export const deleteCategory = deleteCategoryInDb;

export const listAdminItems = listAdminItemsFromDb;
export const getAdminItemDetail = getAdminItemDetailFromDb;
export const createItem = createItemInDb;
export const updateItem = updateItemInDb;
export const deleteItem = deleteItemInDb;

export const createModifierGroup = createModifierGroupInDb;
export const updateModifierGroup = updateModifierGroupInDb;
export const deleteModifierGroup = deleteModifierGroupInDb;
export const createModifierOption = createModifierOptionInDb;
export const updateModifierOption = updateModifierOptionInDb;
export const deleteModifierOption = deleteModifierOptionInDb;

import {
  createCategoryInDb,
  createItemInDb,
  createModifierGroupInDb,
  createModifierOptionInDb,
  deleteCategoryInDb,
  deleteItemInDb,
  deleteModifierGroupInDb,
  deleteModifierOptionInDb,
  updateCategoryInDb,
  updateItemInDb,
  updateModifierGroupInDb,
  updateModifierOptionInDb,
} from "./commands.ts";
import {
  getAdminItemDetailFromDb,
  getPublicItemDetailFromDb,
  listAdminCategoriesFromDb,
  listAdminItemsFromDb,
  listPublicMenuFromDb,
} from "./queries.ts";

export async function listPublicMenuUseCase(input: { search?: string; categoryId?: string }) {
  return listPublicMenuFromDb(input);
}

export async function getPublicItemDetailUseCase(itemId: string) {
  return getPublicItemDetailFromDb(itemId);
}

export async function listAdminCategoriesUseCase(input: Parameters<typeof listAdminCategoriesFromDb>[0]) {
  return listAdminCategoriesFromDb(input);
}

export async function createCategoryUseCase(payload: Parameters<typeof createCategoryInDb>[0]) {
  return createCategoryInDb(payload);
}

export async function updateCategoryUseCase(
  categoryId: Parameters<typeof updateCategoryInDb>[0],
  patch: Parameters<typeof updateCategoryInDb>[1],
) {
  return updateCategoryInDb(categoryId, patch);
}

export async function deleteCategoryUseCase(categoryId: Parameters<typeof deleteCategoryInDb>[0]) {
  return deleteCategoryInDb(categoryId);
}

export async function listAdminItemsUseCase(input: Parameters<typeof listAdminItemsFromDb>[0]) {
  return listAdminItemsFromDb(input);
}

export async function getAdminItemDetailUseCase(itemId: Parameters<typeof getAdminItemDetailFromDb>[0]) {
  return getAdminItemDetailFromDb(itemId);
}

export async function createItemUseCase(payload: Parameters<typeof createItemInDb>[0]) {
  return createItemInDb(payload);
}

export async function updateItemUseCase(
  itemId: Parameters<typeof updateItemInDb>[0],
  patch: Parameters<typeof updateItemInDb>[1],
) {
  return updateItemInDb(itemId, patch);
}

export async function deleteItemUseCase(itemId: Parameters<typeof deleteItemInDb>[0]) {
  return deleteItemInDb(itemId);
}

export async function createModifierGroupUseCase(
  itemId: Parameters<typeof createModifierGroupInDb>[0],
  payload: Parameters<typeof createModifierGroupInDb>[1],
) {
  return createModifierGroupInDb(itemId, payload);
}

export async function updateModifierGroupUseCase(
  groupId: Parameters<typeof updateModifierGroupInDb>[0],
  patch: Parameters<typeof updateModifierGroupInDb>[1],
) {
  return updateModifierGroupInDb(groupId, patch);
}

export async function deleteModifierGroupUseCase(groupId: Parameters<typeof deleteModifierGroupInDb>[0]) {
  return deleteModifierGroupInDb(groupId);
}

export async function createModifierOptionUseCase(
  groupId: Parameters<typeof createModifierOptionInDb>[0],
  payload: Parameters<typeof createModifierOptionInDb>[1],
) {
  return createModifierOptionInDb(groupId, payload);
}

export async function updateModifierOptionUseCase(
  optionId: Parameters<typeof updateModifierOptionInDb>[0],
  patch: Parameters<typeof updateModifierOptionInDb>[1],
) {
  return updateModifierOptionInDb(optionId, patch);
}

export async function deleteModifierOptionUseCase(optionId: Parameters<typeof deleteModifierOptionInDb>[0]) {
  return deleteModifierOptionInDb(optionId);
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { MenuSections, type MenuCategorySection } from "./menu-sections";

type SessionUser = {
  role?: "CUSTOMER" | "ADMIN";
};

type Category = {
  id: string;
  name: string;
};

type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  basePrice: number;
  familyPrice?: number;
  prepMinutes: number;
  isActive: boolean;
  imageUrls: string[];
};

type PublicMenuCategory = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

type PublicMenuItem = MenuCategorySection["items"][number];

type PublicMenuResponse = {
  categories: PublicMenuCategory[];
  items: PublicMenuItem[];
};

type EditItemForm = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  imageUrls: string;
  basePrice: string;
  familyPrice: string;
  prepMinutes: string;
  isActive: boolean;
};

type MenuPageClientProps = {
  categorySections: MenuCategorySection[];
  hasMenuItems: boolean;
};

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as { message?: string } & T;
  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload;
}

function parseList(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildPreviewSections(payload: PublicMenuResponse): MenuCategorySection[] {
  return payload.categories
    .map((category) => ({
      id: category.id,
      name: category.name,
      anchor: `menu-section-${category.id}`,
      items: payload.items.filter((item) => item.categoryId === category.id),
    }))
    .filter((section) => section.items.length > 0);
}

function buildEditForm(item: MenuItem): EditItemForm {
  return {
    id: item.id,
    categoryId: item.categoryId,
    name: item.name,
    description: item.description || "",
    imageUrls: item.imageUrls.join(", "),
    basePrice: String(item.basePrice),
    familyPrice: item.familyPrice === undefined ? "" : String(item.familyPrice),
    prepMinutes: String(item.prepMinutes),
    isActive: item.isActive,
  };
}

export function MenuPageClient({ categorySections, hasMenuItems }: MenuPageClientProps) {
  const [sessionUser, setSessionUser] = useState<SessionUser | null | undefined>(undefined);
  const [sections, setSections] = useState<MenuCategorySection[]>(categorySections);
  const [menuHasItems, setMenuHasItems] = useState(hasMenuItems);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editForm, setEditForm] = useState<EditItemForm | null>(null);
  const [editPending, setEditPending] = useState(false);
  const [editError, setEditError] = useState("");

  const isAdmin = sessionUser?.role === "ADMIN";

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) {
            setSessionUser(null);
          }
          return;
        }

        const payload = (await response.json()) as { user?: SessionUser };
        if (!cancelled) {
          setSessionUser(payload.user || null);
        }
      } catch {
        if (!cancelled) {
          setSessionUser(null);
        }
      }
    };

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadMenuPreview() {
    const result = await api<PublicMenuResponse>("/api/menu");
    setSections(buildPreviewSections(result));
    setMenuHasItems(Array.isArray(result.items) && result.items.length > 0);
  }

  async function loadCategories() {
    const result = await api<{ data: Category[] }>("/api/admin/menu/categories?page=1&pageSize=200");
    setCategories(Array.isArray(result.data) ? result.data : []);
  }

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    void Promise.all([loadMenuPreview(), loadCategories()]);
  }, [isAdmin]);

  useEffect(() => {
    if (!editingItem) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [editingItem]);

  async function handleEditItem(itemId: string) {
    try {
      const result = await api<{ item: MenuItem }>(`/api/admin/menu/items/${itemId}`);
      setEditingItem(result.item);
      setEditForm(buildEditForm(result.item));
      setEditError("");
    } catch (caught) {
      setEditError(caught instanceof Error ? caught.message : "Unable to load item for editing.");
    }
  }

  function closeEditModal() {
    if (editPending) {
      return;
    }
    setEditingItem(null);
    setEditForm(null);
    setEditError("");
  }

  async function saveEditModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingItem || !editForm) {
      return;
    }

    setEditPending(true);
    setEditError("");

    try {
      const payload: Record<string, unknown> = {
        categoryId: editForm.categoryId,
        name: editForm.name,
        description: editForm.description,
        imageUrls: parseList(editForm.imageUrls),
        basePrice: Number(editForm.basePrice),
        prepMinutes: Number(editForm.prepMinutes),
        isActive: editForm.isActive,
      };

      if (editForm.familyPrice.trim().length > 0) {
        payload.familyPrice = Number(editForm.familyPrice);
      }

      await api(`/api/admin/menu/items/${editingItem.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      await loadMenuPreview();
      setEditingItem(null);
      setEditForm(null);
    } catch (caught) {
      setEditError(caught instanceof Error ? caught.message : "Unable to save item.");
    } finally {
      setEditPending(false);
    }
  }

  return (
    <>
      <MenuSections
        categorySections={sections}
        hasMenuItems={menuHasItems}
        adminMode={isAdmin}
        adminUseCustomerCards={isAdmin}
        onAdminEditItem={isAdmin ? handleEditItem : undefined}
      />

      {editingItem && editForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <section className="w-full max-w-2xl rounded-[22px] border-[3px] border-[#2d1d13] bg-[linear-gradient(155deg,#fff4dd_0%,#f9ecd4_60%,#e7f6ef_100%)] p-5 shadow-[6px_6px_0_0_#2d1d13]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-2xl font-black text-[#1f1f1f]">Edit Menu Item</h3>
                <p className="text-xs text-[#6a4b30]">ID: {editForm.id}</p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={editPending}
                className="rounded-full border border-[#2d1d13] bg-white px-3 py-1 text-sm font-semibold text-[#2d1d13]"
              >
                X
              </button>
            </div>

            <form className="grid gap-3" onSubmit={saveEditModal}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  <span className="font-semibold">Category</span>
                  <select
                    className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                    value={editForm.categoryId}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current ? { ...current, categoryId: event.target.value } : current,
                      )
                    }
                    disabled={editPending}
                    required
                  >
                    {categories.length > 0 ? (
                      categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))
                    ) : (
                      <option value={editForm.categoryId}>Current Category</option>
                    )}
                  </select>
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="font-semibold">Active</span>
                  <select
                    className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                    value={editForm.isActive ? "true" : "false"}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current
                          ? { ...current, isActive: event.target.value === "true" }
                          : current,
                      )
                    }
                    disabled={editPending}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </label>

                <label className="grid gap-1 text-sm sm:col-span-2">
                  <span className="font-semibold">Name</span>
                  <input
                    className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                    value={editForm.name}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current ? { ...current, name: event.target.value } : current,
                      )
                    }
                    disabled={editPending}
                    required
                  />
                </label>

                <label className="grid gap-1 text-sm sm:col-span-2">
                  <span className="font-semibold">Description</span>
                  <textarea
                    className="min-h-20 rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                    value={editForm.description}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current ? { ...current, description: event.target.value } : current,
                      )
                    }
                    disabled={editPending}
                  />
                </label>

                <label className="grid gap-1 text-sm sm:col-span-2">
                  <span className="font-semibold">Image URL(s) - comma separated</span>
                  <input
                    className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                    value={editForm.imageUrls}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current ? { ...current, imageUrls: event.target.value } : current,
                      )
                    }
                    disabled={editPending}
                  />
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="font-semibold">Base Price (EUR)</span>
                  <input
                    className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.basePrice}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current ? { ...current, basePrice: event.target.value } : current,
                      )
                    }
                    disabled={editPending}
                    required
                  />
                </label>

                {editingItem.familyPrice !== undefined ? (
                  <label className="grid gap-1 text-sm">
                    <span className="font-semibold">Family Price (EUR)</span>
                    <input
                      className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.familyPrice}
                      onChange={(event) =>
                        setEditForm((current) =>
                          current ? { ...current, familyPrice: event.target.value } : current,
                        )
                      }
                      disabled={editPending}
                    />
                  </label>
                ) : null}

                <label className="grid gap-1 text-sm">
                  <span className="font-semibold">Prep Minutes</span>
                  <input
                    className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                    type="number"
                    min="0"
                    value={editForm.prepMinutes}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current ? { ...current, prepMinutes: event.target.value } : current,
                      )
                    }
                    disabled={editPending}
                    required
                  />
                </label>
              </div>

              {editError ? <p className="text-sm text-red-700">{editError}</p> : null}

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={editPending}
                  className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editPending}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)]"
                >
                  {editPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}


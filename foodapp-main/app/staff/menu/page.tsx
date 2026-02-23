"use client";

import { FormEvent, useEffect, useState } from "react";
import { MenuSections, type MenuCategorySection } from "@/app/menu/menu-sections";

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
  itemCount: number;
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

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
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
      anchor: `staff-menu-section-${category.id}`,
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

export default function StaffMenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categorySearch, setCategorySearch] = useState("");

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySort, setNewCategorySort] = useState("0");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [previewSections, setPreviewSections] = useState<MenuCategorySection[]>([]);
  const [previewHasItems, setPreviewHasItems] = useState(false);
  const [previewPending, setPreviewPending] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editForm, setEditForm] = useState<EditItemForm | null>(null);
  const [editPending, setEditPending] = useState(false);
  const [editError, setEditError] = useState("");

  async function run(action: () => Promise<void>, success: string) {
    setPending(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error.");
    } finally {
      setPending(false);
    }
  }

  async function loadCategories() {
    const query = new URLSearchParams({ page: "1", pageSize: "20", search: categorySearch });
    const result = await api<{ data: Category[] }>(`/api/admin/menu/categories?${query.toString()}`);
    setCategories(result.data);
  }

  async function loadMenuPreview() {
    setPreviewPending(true);
    setPreviewError("");

    try {
      const result = await api<PublicMenuResponse>("/api/menu");
      setPreviewSections(buildPreviewSections(result));
      setPreviewHasItems(Array.isArray(result.items) && result.items.length > 0);
    } catch (caught) {
      setPreviewError(caught instanceof Error ? caught.message : "Unable to load full menu preview.");
    } finally {
      setPreviewPending(false);
    }
  }

  async function refreshAll() {
    await Promise.all([loadCategories(), loadMenuPreview()]);
  }

  useEffect(() => {
    void loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySearch]);

  useEffect(() => {
    void loadMenuPreview();
  }, []);

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

  function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => {
      await api("/api/admin/menu/categories", {
        method: "POST",
        body: JSON.stringify({
          name: newCategoryName,
          sortOrder: Number(newCategorySort),
        }),
      });
      setNewCategoryName("");
      setNewCategorySort("0");
      await refreshAll();
    }, "Category created.");
  }

  function renameCategory(category: Category) {
    const name = window.prompt("Category name", category.name);
    if (!name) return;
    void run(async () => {
      await api(`/api/admin/menu/categories/${category.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      await refreshAll();
    }, "Category updated.");
  }

  function toggleCategory(category: Category) {
    void run(async () => {
      await api(`/api/admin/menu/categories/${category.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !category.isActive }),
      });
      await refreshAll();
    }, "Category status updated.");
  }

  function deleteCategory(category: Category) {
    void run(async () => {
      await api(`/api/admin/menu/categories/${category.id}`, { method: "DELETE" });
      await refreshAll();
    }, "Category deleted.");
  }

  async function handlePreviewEditItem(itemId: string) {
    try {
      const result = await api<{ item: MenuItem }>(`/api/admin/menu/items/${itemId}`);
      setEditingItem(result.item);
      setEditForm(buildEditForm(result.item));
      setEditError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load item for editing.");
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

      await refreshAll();
      setMessage("Item updated.");
      setEditingItem(null);
      setEditForm(null);
    } catch (caught) {
      setEditError(caught instanceof Error ? caught.message : "Unable to save item.");
    } finally {
      setEditPending(false);
    }
  }

  return (
    <section className="grid gap-4">
      <header className="panel p-4 sm:p-6">
        <h2 className="text-2xl">Menu Operations</h2>
        <p className="mt-2 text-sm">Admin CRUD with search, pagination, modifier rules, and update timestamps.</p>
        {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </header>

      <section className="panel p-4 sm:p-6">
        <h3 className="text-xl">Categories</h3>
        <form className="mt-3 grid gap-3 sm:grid-cols-4" onSubmit={createCategory}>
          <input className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm" placeholder="New category" value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} required />
          <input className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm" type="number" min={0} value={newCategorySort} onChange={(event) => setNewCategorySort(event.target.value)} required />
          <input className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm" type="search" placeholder="Search categories" value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} />
          <button type="submit" className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-ink)]" disabled={pending}>Add</button>
        </form>
        <div className="mt-4 grid gap-2">
          {categories.map((category) => (
            <article key={category.id} className="rounded-lg border border-[var(--line)] bg-white p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{category.name} ({category.itemCount} items)</span>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="rounded border border-[var(--line)] px-2 py-1 text-xs" onClick={() => renameCategory(category)} disabled={pending}>Rename</button>
                  <button type="button" className="rounded border border-[var(--line)] px-2 py-1 text-xs" onClick={() => toggleCategory(category)} disabled={pending}>{category.isActive ? "Deactivate" : "Activate"}</button>
                  <button type="button" className="rounded border border-red-300 px-2 py-1 text-xs text-red-700" onClick={() => deleteCategory(category)} disabled={pending}>Delete</button>
                </div>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">Updated: {new Date(category.updatedAt).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel p-4 sm:p-6">
        <h3 className="text-xl">Full Menu Preview</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Customer-facing full menu view inside admin dashboard.
        </p>
        {previewError ? <p className="mt-3 text-sm text-red-700">{previewError}</p> : null}
        {previewPending ? (
          <p className="mt-4 text-sm text-[var(--muted)]">Loading full menu...</p>
        ) : (
          <div className="mt-4">
            <MenuSections
              categorySections={previewSections}
              hasMenuItems={previewHasItems}
              embedded
              adminMode
              onAdminEditItem={handlePreviewEditItem}
            />
          </div>
        )}
      </section>

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
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
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
    </section>
  );
}

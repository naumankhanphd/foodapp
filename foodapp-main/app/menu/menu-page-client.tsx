"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
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
  focalX: number | null;
  focalY: number | null;
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
  imageUrl: string;
  focalX: number;
  focalY: number;
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
    imageUrl: item.imageUrls[0] || "",
    focalX: item.focalX ?? 50,
    focalY: item.focalY ?? 50,
    basePrice: String(item.basePrice),
    familyPrice: item.familyPrice === undefined ? "" : String(item.familyPrice),
    prepMinutes: String(item.prepMinutes),
    isActive: item.isActive,
  };
}

function buildCreateForm(categoryId: string): EditItemForm {
  return {
    id: "new-item",
    categoryId,
    name: "",
    description: "",
    imageUrl: "",
    focalX: 50,
    focalY: 50,
    basePrice: "",
    familyPrice: "",
    prepMinutes: "10",
    isActive: true,
  };
}

// ---------------------------------------------------------------------------
// Focal point editor component
// ---------------------------------------------------------------------------

type ImageFocalEditorProps = {
  imageUrl: string;
  focalX: number;
  focalY: number;
  onChange: (x: number, y: number) => void;
};

function ImageFocalEditor({ imageUrl, focalX, focalY, onChange }: ImageFocalEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const applyPointer = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
      onChange(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
    },
    [onChange],
  );

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    applyPointer(e.clientX, e.clientY);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      applyPointer(e.clientX, e.clientY);
    };
    const onUp = () => {
      isDragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [applyPointer]);

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) applyPointer(t.clientX, t.clientY);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    if (t) applyPointer(t.clientX, t.clientY);
  };

  return (
    <div className="max-w-xs mx-auto">
      {/* Preview container — matches menu card aspect ratio (4:3) */}
      <div
        ref={containerRef}
        className={`relative aspect-[4/3] w-full overflow-hidden rounded-xl border-2 border-[#2d1d13] bg-[#fff7ea] select-none ${imageUrl ? "cursor-crosshair" : ""}`}
        onMouseDown={imageUrl ? onMouseDown : undefined}
        onTouchStart={imageUrl ? onTouchStart : undefined}
        onTouchMove={imageUrl ? onTouchMove : undefined}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt="Preview"
              className="pointer-events-none h-full w-full object-cover"
              style={{ objectPosition: `${focalX}% ${focalY}%` }}
              draggable={false}
            />
            {/* Focal crosshair */}
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${focalX}%`, top: `${focalY}%` }}
            >
              <div className="h-7 w-7 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.5)]" />
              <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)]" />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-[#c0a880]">No image</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

export function MenuPageClient({ categorySections, hasMenuItems }: MenuPageClientProps) {
  const [sessionUser, setSessionUser] = useState<SessionUser | null | undefined>(undefined);
  const [sections, setSections] = useState<MenuCategorySection[]>(categorySections);
  const [menuHasItems, setMenuHasItems] = useState(hasMenuItems);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editForm, setEditForm] = useState<EditItemForm | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [editError, setEditError] = useState("");
  const [adminActionError, setAdminActionError] = useState("");
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = sessionUser?.role === "ADMIN";

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setSessionUser(null);
          return;
        }
        const payload = (await response.json()) as { user?: SessionUser };
        if (!cancelled) setSessionUser(payload.user || null);
      } catch {
        if (!cancelled) setSessionUser(null);
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
    if (!isAdmin) return;
    void Promise.all([loadMenuPreview(), loadCategories()]);
  }, [isAdmin]);

  useEffect(() => {
    if (!editingItem) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [editingItem]);

  async function handleEditItem(itemId: string) {
    try {
      const result = await api<{ item: MenuItem }>(`/api/admin/menu/items/${itemId}`);
      setIsCreateMode(false);
      setEditingItem(result.item);
      setEditForm(buildEditForm(result.item));
      setEditError("");
      setUploadError("");
      setAdminActionError("");
    } catch (caught) {
      setEditError(caught instanceof Error ? caught.message : "Unable to load item for editing.");
    }
  }

  function openCreateModal() {
    if (categories.length === 0) {
      setAdminActionError("No categories available. Create a category first.");
      return;
    }
    setIsCreateMode(true);
    setEditingItem(null);
    setEditForm(buildCreateForm(categories[0].id));
    setEditError("");
    setUploadError("");
    setAdminActionError("");
  }

  async function handleDeleteItem(itemId: string, itemName: string) {
    const confirmed = window.confirm(`Delete "${itemName}" from menu?`);
    if (!confirmed) return;

    setAdminActionError("");
    try {
      await api(`/api/admin/menu/items/${itemId}`, { method: "DELETE" });
      await loadMenuPreview();
      if (editingItem?.id === itemId) {
        setEditingItem(null);
        setEditForm(null);
        setIsCreateMode(false);
      }
    } catch (caught) {
      setAdminActionError(caught instanceof Error ? caught.message : "Unable to delete item.");
    }
  }

  function closeEditModal() {
    if (editPending || uploadPending) return;
    setIsCreateMode(false);
    setEditingItem(null);
    setEditForm(null);
    setEditError("");
    setUploadError("");
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !editForm) return;

    setUploadPending(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", editForm.name || "image");

      const response = await fetch("/api/admin/upload/image", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => ({}))) as {
        url?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || "Upload failed.");
      }

      setEditForm((current) =>
        current
          ? { ...current, imageUrl: payload.url || "", focalX: 50, focalY: 50 }
          : current,
      );
    } catch (caught) {
      setUploadError(caught instanceof Error ? caught.message : "Upload failed.");
    } finally {
      setUploadPending(false);
      // Reset so the same file can be re-uploaded if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function saveEditModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editForm) return;

    setEditPending(true);
    setEditError("");

    try {
      const payload: Record<string, unknown> = {
        categoryId: editForm.categoryId,
        name: editForm.name,
        description: editForm.description,
        imageUrls: editForm.imageUrl ? [editForm.imageUrl] : [],
        basePrice: Number(editForm.basePrice),
        prepMinutes: Number(editForm.prepMinutes),
        isActive: editForm.isActive,
        focalX: editForm.focalX,
        focalY: editForm.focalY,
      };

      if (editForm.familyPrice.trim().length > 0) {
        payload.familyPrice = Number(editForm.familyPrice);
      }

      if (isCreateMode) {
        await api("/api/admin/menu/items", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        if (!editingItem) throw new Error("Menu item not selected for editing.");
        await api(`/api/admin/menu/items/${editingItem.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }

      await loadMenuPreview();
      setIsCreateMode(false);
      setEditingItem(null);
      setEditForm(null);
    } catch (caught) {
      setEditError(
        caught instanceof Error
          ? caught.message
          : isCreateMode
            ? "Unable to create item."
            : "Unable to save item.",
      );
    } finally {
      setEditPending(false);
    }
  }

  const disabled = editPending || uploadPending;

  return (
    <>
      {isAdmin ? (
        <section className="mx-auto mt-3 w-[min(1460px,calc(100%-2rem))]">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[#2d1d13] bg-[#f7f2ff] p-3 shadow-[3px_3px_0_0_#2d1d13]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#4a4260]">
                Admin Menu Controls
              </p>
              <p className="text-sm font-semibold text-[#1f1f1f]">
                Add new items or edit and delete existing items.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--accent-ink)] hover:bg-[#ea6b12]"
            >
              + Add Item
            </button>
          </div>
          {adminActionError ? (
            <p className="mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {adminActionError}
            </p>
          ) : null}
        </section>
      ) : null}

      <MenuSections
        categorySections={sections}
        hasMenuItems={menuHasItems}
        adminMode={isAdmin}
        adminUseCustomerCards={isAdmin}
        onAdminEditItem={isAdmin ? handleEditItem : undefined}
        onAdminDeleteItem={isAdmin ? handleDeleteItem : undefined}
      />

      {editForm ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/45">
          <div className="flex min-h-full items-center justify-center p-4">
          <section className="w-full max-w-2xl rounded-[22px] border-[3px] border-[#2d1d13] bg-[linear-gradient(155deg,#fff4dd_0%,#f9ecd4_60%,#e7f6ef_100%)] p-5 shadow-[6px_6px_0_0_#2d1d13]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-2xl font-black text-[#1f1f1f]">
                  {isCreateMode ? "Add Menu Item" : "Edit Menu Item"}
                </h3>
                {!isCreateMode ? (
                  <p className="text-xs text-[#6a4b30]">ID: {editForm.id}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={disabled}
                className="rounded-full border border-[#2d1d13] bg-white px-3 py-1 text-sm font-semibold text-[#2d1d13]"
              >
                ✕
              </button>
            </div>

            <form className="grid gap-3" onSubmit={saveEditModal}>

              {/* Image upload + focal editor — full width at the top */}
              <div className="grid gap-2">
                <span className="text-sm font-semibold">Image</span>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={disabled}
                />

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                    className="rounded-lg border-2 border-[#2d1d13] bg-white px-4 py-2 text-sm font-semibold text-[#2d1d13] hover:bg-[#fff4dd] disabled:opacity-50"
                  >
                    {uploadPending ? "Uploading…" : "Upload Image"}
                  </button>
                  {editForm.imageUrl ? (
                    <span className="max-w-xs truncate text-xs text-[#4a4260]">
                      {editForm.imageUrl}
                    </span>
                  ) : (
                    <span className="text-xs text-[#a08060]">No image selected</span>
                  )}
                  {editForm.imageUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        setEditForm((c) =>
                          c ? { ...c, imageUrl: "", focalX: 50, focalY: 50 } : c,
                        )
                      }
                      disabled={disabled}
                      className="ml-auto text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                {uploadError ? (
                  <p className="text-xs text-red-600">{uploadError}</p>
                ) : null}

                <ImageFocalEditor
                  imageUrl={editForm.imageUrl}
                  focalX={editForm.focalX}
                  focalY={editForm.focalY}
                  onChange={(x, y) =>
                    setEditForm((c) => (c ? { ...c, focalX: x, focalY: y } : c))
                  }
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Category */}
                <label className="grid gap-1 text-sm">
                  <span className="font-semibold">Category</span>
                  <select
                    className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                    value={editForm.categoryId}
                    onChange={(e) =>
                      setEditForm((c) => (c ? { ...c, categoryId: e.target.value } : c))
                    }
                    disabled={disabled}
                    required
                  >
                    {categories.length > 0 ? (
                      categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))
                    ) : (
                      <option value={editForm.categoryId}>Current Category</option>
                    )}
                  </select>
                </label>

                {/* Active */}
                <label className="grid gap-1 text-sm">
                  <span className="font-semibold">Active</span>
                  <select
                    className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                    value={editForm.isActive ? "true" : "false"}
                    onChange={(e) =>
                      setEditForm((c) =>
                        c ? { ...c, isActive: e.target.value === "true" } : c,
                      )
                    }
                    disabled={disabled}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </label>

                {/* Name */}
                <label className="grid gap-1 text-sm sm:col-span-2">
                  <span className="font-semibold">Name</span>
                  <input
                    className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((c) => (c ? { ...c, name: e.target.value } : c))
                    }
                    disabled={disabled}
                    required
                    minLength={2}
                  />
                </label>

                {/* Description */}
                <label className="grid gap-1 text-sm sm:col-span-2">
                  <span className="font-semibold">Description</span>
                  <textarea
                    className="min-h-20 rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((c) => (c ? { ...c, description: e.target.value } : c))
                    }
                    disabled={disabled}
                  />
                </label>

                {/* Base price */}
                <label className="grid gap-1 text-sm">
                  <span className="font-semibold">Base Price (EUR)</span>
                  <input
                    className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.basePrice}
                    onChange={(e) =>
                      setEditForm((c) => (c ? { ...c, basePrice: e.target.value } : c))
                    }
                    disabled={disabled}
                    required
                  />
                </label>

                {/* Family price (pizza edit only) */}
                {!isCreateMode && editingItem?.familyPrice !== undefined ? (
                  <label className="grid gap-1 text-sm">
                    <span className="font-semibold">Family Price (EUR)</span>
                    <input
                      className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.familyPrice}
                      onChange={(e) =>
                        setEditForm((c) => (c ? { ...c, familyPrice: e.target.value } : c))
                      }
                      disabled={disabled}
                    />
                  </label>
                ) : null}

                {/* Prep minutes */}
                <label className="grid gap-1 text-sm">
                  <span className="font-semibold">Prep Minutes</span>
                  <input
                    className="rounded-lg border border-[var(--line)] bg-white px-3 py-2"
                    type="number"
                    min="0"
                    value={editForm.prepMinutes}
                    onChange={(e) =>
                      setEditForm((c) => (c ? { ...c, prepMinutes: e.target.value } : c))
                    }
                    disabled={disabled}
                    required
                  />
                </label>
              </div>

              {editError ? <p className="text-sm text-red-700">{editError}</p> : null}

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={disabled}
                  className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disabled}
                  className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)]"
                >
                  {editPending
                    ? isCreateMode
                      ? "Creating…"
                      : "Saving…"
                    : isCreateMode
                      ? "Create Item"
                      : "Save"}
                </button>
              </div>
            </form>
          </section>
          </div>
        </div>
      ) : null}
    </>
  );
}

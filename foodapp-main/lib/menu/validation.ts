export class MenuValidationError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number = 400, code: string = "MENU_VALIDATION_ERROR") {
    super(message);
    this.name = "MenuValidationError";
    this.status = status;
    this.code = code;
  }
}

function nonEmptyString(value: unknown, fieldName: string, minLength: number = 1): string {
  const text = String(value || "").trim();
  if (text.length < minLength) {
    throw new MenuValidationError(`${fieldName} is required.`, 400, "INVALID_INPUT");
  }
  return text;
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

function parseBoolean(value: unknown, fallback: boolean | undefined): boolean | undefined {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }
  throw new MenuValidationError("Boolean value is invalid.", 400, "INVALID_INPUT");
}

function parseInteger(
  value: unknown,
  fieldName: string,
  {
    min = Number.MIN_SAFE_INTEGER,
    fallback,
    allowUndefined = false,
  }: { min?: number; fallback?: number; allowUndefined?: boolean } = {},
): number | undefined {
  if (value === undefined || value === null || value === "") {
    if (allowUndefined) {
      return undefined;
    }
    if (fallback !== undefined) {
      return fallback;
    }
    throw new MenuValidationError(`${fieldName} is required.`, 400, "INVALID_INPUT");
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < min) {
    throw new MenuValidationError(`${fieldName} is invalid.`, 400, "INVALID_INPUT");
  }
  return parsed;
}

function parseDecimal(
  value: unknown,
  fieldName: string,
  {
    min = 0,
    fallback,
    allowUndefined = false,
  }: { min?: number; fallback?: number; allowUndefined?: boolean } = {},
): number | undefined {
  if (value === undefined || value === null || value === "") {
    if (allowUndefined) {
      return undefined;
    }
    if (fallback !== undefined) {
      return fallback;
    }
    throw new MenuValidationError(`${fieldName} is required.`, 400, "INVALID_INPUT");
  }

  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed) || parsed < min) {
    throw new MenuValidationError(`${fieldName} is invalid.`, 400, "INVALID_INPUT");
  }

  return Number(parsed.toFixed(2));
}

function normalizeTextArray(value: unknown): string[] {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  const source = Array.isArray(value) ? value : String(value).split(",");
  const cleaned = (source as unknown[])
    .map((entry) => String(entry).trim())
    .filter((entry) => entry.length > 0);

  const dedup: string[] = [];
  const seen = new Set<string>();
  for (const entry of cleaned) {
    const key = entry.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    dedup.push(entry);
  }

  return dedup;
}

export function parseListQuery(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
  search: string;
} {
  const page = parseInteger(searchParams.get("page"), "page", {
    min: 1,
    fallback: 1,
  }) as number;
  const pageSize = parseInteger(searchParams.get("pageSize"), "pageSize", {
    min: 1,
    fallback: 10,
  }) as number;
  const normalizedPageSize = Math.min(pageSize, 50);

  return {
    page,
    pageSize: normalizedPageSize,
    search: optionalString(searchParams.get("search") || "") || "",
  };
}

export function validateCategoryCreate(payload: Record<string, unknown>): {
  name: string;
  sortOrder: number;
  isActive: boolean;
} {
  return {
    name: nonEmptyString(payload.name, "Category name", 2),
    sortOrder: parseInteger(payload.sortOrder, "sortOrder", { fallback: 0, min: 0 }) as number,
    isActive: parseBoolean(payload.isActive, true) as boolean,
  };
}

export function validateCategoryUpdate(payload: Record<string, unknown>): {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
} {
  const next = {
    name: optionalString(payload.name),
    sortOrder: parseInteger(payload.sortOrder, "sortOrder", {
      allowUndefined: true,
      min: 0,
    }),
    isActive: parseBoolean(payload.isActive, undefined),
  };

  if (next.name === undefined && next.sortOrder === undefined && next.isActive === undefined) {
    throw new MenuValidationError("No category fields provided for update.", 400, "INVALID_INPUT");
  }

  return next;
}

export function validateItemCreate(payload: Record<string, unknown>): {
  categoryId: string;
  name: string;
  description: string;
  imageUrls: string[];
  basePrice: number;
  isActive: boolean;
  prepMinutes: number;
  focalX?: number;
  focalY?: number;
} {
  return {
    categoryId: nonEmptyString(payload.categoryId, "Category id"),
    name: nonEmptyString(payload.name, "Item name", 2),
    description: optionalString(payload.description) || "",
    imageUrls: normalizeTextArray(payload.imageUrls),
    basePrice: parseDecimal(payload.basePrice, "basePrice", { min: 0 }) as number,
    isActive: parseBoolean(payload.isActive, true) as boolean,
    prepMinutes: parseInteger(payload.prepMinutes, "prepMinutes", { min: 0, fallback: 10 }) as number,
    focalX: parseDecimal(payload.focalX, "focalX", { allowUndefined: true, min: 0 }) as number | undefined,
    focalY: parseDecimal(payload.focalY, "focalY", { allowUndefined: true, min: 0 }) as number | undefined,
  };
}

export function validateItemUpdate(payload: Record<string, unknown>): {
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
} {
  const next = {
    categoryId: optionalString(payload.categoryId),
    name: optionalString(payload.name),
    description: optionalString(payload.description),
    imageUrls:
      payload.imageUrls === undefined
        ? undefined
        : normalizeTextArray(payload.imageUrls),
    basePrice: parseDecimal(payload.basePrice, "basePrice", {
      allowUndefined: true,
      min: 0,
    }),
    familyPrice: parseDecimal(payload.familyPrice, "familyPrice", {
      allowUndefined: true,
      min: 0,
    }),
    isActive: parseBoolean(payload.isActive, undefined),
    prepMinutes: parseInteger(payload.prepMinutes, "prepMinutes", {
      allowUndefined: true,
      min: 0,
    }),
    focalX: payload.focalX === null ? null : parseDecimal(payload.focalX, "focalX", { allowUndefined: true, min: 0 }) as number | undefined,
    focalY: payload.focalY === null ? null : parseDecimal(payload.focalY, "focalY", { allowUndefined: true, min: 0 }) as number | undefined,
  };

  const hasAnyField = Object.values(next).some((value) => value !== undefined);
  if (!hasAnyField) {
    throw new MenuValidationError("No item fields provided for update.", 400, "INVALID_INPUT");
  }

  return next;
}

function validateModifierRule(minSelect: number, maxSelect: number): void {
  if (minSelect < 0 || maxSelect < 0 || minSelect > maxSelect) {
    throw new MenuValidationError(
      "Modifier selection rule is invalid. Ensure 0 <= min <= max.",
      400,
      "INVALID_MODIFIER_RULE",
    );
  }
}

export function validateModifierGroupCreate(payload: Record<string, unknown>): {
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
} {
  const minSelect = parseInteger(payload.minSelect, "minSelect", { min: 0, fallback: 0 }) as number;
  const maxSelect = parseInteger(payload.maxSelect, "maxSelect", { min: 0, fallback: 1 }) as number;
  validateModifierRule(minSelect, maxSelect);

  return {
    name: nonEmptyString(payload.name, "Modifier group name", 2),
    isRequired: parseBoolean(payload.isRequired, false) as boolean,
    minSelect,
    maxSelect,
  };
}

export function validateModifierGroupUpdate(payload: Record<string, unknown>): {
  name?: string;
  isRequired?: boolean;
  minSelect?: number;
  maxSelect?: number;
} {
  const next = {
    name: optionalString(payload.name),
    isRequired: parseBoolean(payload.isRequired, undefined),
    minSelect: parseInteger(payload.minSelect, "minSelect", {
      allowUndefined: true,
      min: 0,
    }),
    maxSelect: parseInteger(payload.maxSelect, "maxSelect", {
      allowUndefined: true,
      min: 0,
    }),
  };

  const hasAnyField = Object.values(next).some((value) => value !== undefined);
  if (!hasAnyField) {
    throw new MenuValidationError("No modifier group fields provided for update.", 400, "INVALID_INPUT");
  }

  if (next.minSelect !== undefined || next.maxSelect !== undefined) {
    const min = next.minSelect ?? 0;
    const max = next.maxSelect ?? min;
    validateModifierRule(min, max);
  }

  return next;
}

export function validateModifierOptionCreate(payload: Record<string, unknown>): {
  name: string;
  priceDelta: number;
  isActive: boolean;
} {
  return {
    name: nonEmptyString(payload.name, "Modifier option name", 2),
    priceDelta: parseDecimal(payload.priceDelta, "priceDelta", { min: 0, fallback: 0 }) as number,
    isActive: parseBoolean(payload.isActive, true) as boolean,
  };
}

export function validateModifierOptionUpdate(payload: Record<string, unknown>): {
  name?: string;
  priceDelta?: number;
  isActive?: boolean;
} {
  const next = {
    name: optionalString(payload.name),
    priceDelta: parseDecimal(payload.priceDelta, "priceDelta", {
      allowUndefined: true,
      min: 0,
    }),
    isActive: parseBoolean(payload.isActive, undefined),
  };

  const hasAnyField = Object.values(next).some((value) => value !== undefined);
  if (!hasAnyField) {
    throw new MenuValidationError("No modifier option fields provided for update.", 400, "INVALID_INPUT");
  }

  return next;
}

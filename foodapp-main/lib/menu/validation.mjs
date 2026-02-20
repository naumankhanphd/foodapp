export class MenuValidationError extends Error {
  constructor(message, status = 400, code = "MENU_VALIDATION_ERROR") {
    super(message);
    this.name = "MenuValidationError";
    this.status = status;
    this.code = code;
  }
}

function nonEmptyString(value, fieldName, minLength = 1) {
  const text = String(value || "").trim();
  if (text.length < minLength) {
    throw new MenuValidationError(`${fieldName} is required.`, 400, "INVALID_INPUT");
  }
  return text;
}

function optionalString(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

function parseBoolean(value, fallback) {
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

function parseInteger(value, fieldName, { min = Number.MIN_SAFE_INTEGER, fallback, allowUndefined = false } = {}) {
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

function parseDecimal(value, fieldName, { min = 0, fallback, allowUndefined = false } = {}) {
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

function normalizeTextArray(value) {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  const source = Array.isArray(value) ? value : String(value).split(",");
  const cleaned = source
    .map((entry) => String(entry).trim())
    .filter((entry) => entry.length > 0);

  const dedup = [];
  const seen = new Set();
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

export function parseListQuery(searchParams) {
  const page = parseInteger(searchParams.get("page"), "page", {
    min: 1,
    fallback: 1,
  });
  const pageSize = parseInteger(searchParams.get("pageSize"), "pageSize", {
    min: 1,
    fallback: 10,
  });
  const normalizedPageSize = Math.min(pageSize, 50);

  return {
    page,
    pageSize: normalizedPageSize,
    search: optionalString(searchParams.get("search") || "") || "",
  };
}

export function validateCategoryCreate(payload) {
  return {
    name: nonEmptyString(payload.name, "Category name", 2),
    sortOrder: parseInteger(payload.sortOrder, "sortOrder", { fallback: 0, min: 0 }),
    isActive: parseBoolean(payload.isActive, true),
  };
}

export function validateCategoryUpdate(payload) {
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

export function validateItemCreate(payload) {
  return {
    categoryId: nonEmptyString(payload.categoryId, "Category id"),
    name: nonEmptyString(payload.name, "Item name", 2),
    description: nonEmptyString(payload.description, "Item description", 3),
    imageUrls: normalizeTextArray(payload.imageUrls),
    basePrice: parseDecimal(payload.basePrice, "basePrice", { min: 0 }),
    isActive: parseBoolean(payload.isActive, true),
    prepMinutes: parseInteger(payload.prepMinutes, "prepMinutes", { min: 0, fallback: 10 }),
  };
}

export function validateItemUpdate(payload) {
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
  };

  const hasAnyField = Object.values(next).some((value) => value !== undefined);
  if (!hasAnyField) {
    throw new MenuValidationError("No item fields provided for update.", 400, "INVALID_INPUT");
  }

  return next;
}

function validateModifierRule(minSelect, maxSelect) {
  if (minSelect < 0 || maxSelect < 0 || minSelect > maxSelect) {
    throw new MenuValidationError(
      "Modifier selection rule is invalid. Ensure 0 <= min <= max.",
      400,
      "INVALID_MODIFIER_RULE",
    );
  }
}

export function validateModifierGroupCreate(payload) {
  const minSelect = parseInteger(payload.minSelect, "minSelect", { min: 0, fallback: 0 });
  const maxSelect = parseInteger(payload.maxSelect, "maxSelect", { min: 0, fallback: 1 });
  validateModifierRule(minSelect, maxSelect);

  return {
    name: nonEmptyString(payload.name, "Modifier group name", 2),
    isRequired: parseBoolean(payload.isRequired, false),
    minSelect,
    maxSelect,
  };
}

export function validateModifierGroupUpdate(payload) {
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

export function validateModifierOptionCreate(payload) {
  return {
    name: nonEmptyString(payload.name, "Modifier option name", 2),
    priceDelta: parseDecimal(payload.priceDelta, "priceDelta", { min: 0, fallback: 0 }),
    isActive: parseBoolean(payload.isActive, true),
  };
}

export function validateModifierOptionUpdate(payload) {
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

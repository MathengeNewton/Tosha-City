/**
 * Product "kinds" map to backend ProductCategory + ProductSaleMode + ProductSegment.
 */

export const PRODUCT_SEGMENT = {
  MEAT: "MEAT",
  PREPARED: "PREPARED",
  RETAIL: "RETAIL",
  KITCHEN_SUPPLY: "KITCHEN_SUPPLY",
};

export const PRODUCT_KIND_OPTIONS = [
  {
    id: "RAW_WEIGHT",
    title: "Raw meat (by weight)",
    description: "Counter cuts sold on the scale — beef, pork, liver, etc.",
    category: "RAW_STOCK",
    saleMode: "WEIGHT",
    segment: "MEAT",
    defaultUnit: "kg",
    showParentByproduct: true,
    suggestSalesPrompt: false,
  },
  {
    id: "RAW_PIECE",
    title: "Raw by piece",
    description: "Whole birds, fixed cuts, or items counted one-by-one.",
    category: "RAW_STOCK",
    saleMode: "PIECE",
    segment: "MEAT",
    defaultUnit: "piece",
    showParentByproduct: true,
    suggestSalesPrompt: false,
  },
  {
    id: "RETAIL_PACKAGED",
    title: "Retail — drinks & packs",
    description: "Soda, water, packets sold at the till or on table tickets.",
    category: "CONSUMABLE",
    saleMode: "PIECE",
    segment: "RETAIL",
    defaultUnit: "piece",
    showParentByproduct: false,
    suggestSalesPrompt: false,
  },
  {
    id: "KITCHEN_SUPPLY",
    title: "Kitchen & recipe inputs",
    description: "Salt, soy sauce, cooking oil — tracked for production; not on restaurant dish picker.",
    category: "CONSUMABLE",
    saleMode: "PIECE",
    segment: "KITCHEN_SUPPLY",
    defaultUnit: "piece",
    showParentByproduct: false,
    suggestSalesPrompt: false,
  },
  {
    id: "KITCHEN_PORTION",
    title: "Kitchen / plate (portions)",
    description: "Fry meat, ugali plates, roasted batches — sold as portions.",
    category: "PRODUCTION_ITEM",
    saleMode: "PORTION",
    segment: "PREPARED",
    defaultUnit: "portion",
    showParentByproduct: false,
    suggestSalesPrompt: true,
    salesPromptExample: "Number of portions",
  },
  {
    id: "KITCHEN_PIECE",
    title: "Kitchen item (by piece)",
    description: "Prepared items counted one at a time (e.g. skewers, fixed cuts).",
    category: "PRODUCTION_ITEM",
    saleMode: "PIECE",
    segment: "PREPARED",
    defaultUnit: "piece",
    showParentByproduct: false,
    suggestSalesPrompt: false,
  },
  {
    id: "SOUP_CUP",
    title: "Soup, mutura, by cup",
    description: "Counted in cups or similar units at the till.",
    category: "PRODUCTION_ITEM",
    saleMode: "CUP",
    segment: "PREPARED",
    defaultUnit: "cup",
    showParentByproduct: false,
    suggestSalesPrompt: true,
    salesPromptExample: "Number of cups",
  },
  {
    id: "COOKED_WEIGHT",
    title: "Prepared meat (by weight)",
    description: "Cooked or marinated items still priced per kg.",
    category: "PRODUCTION_ITEM",
    saleMode: "WEIGHT",
    segment: "PREPARED",
    defaultUnit: "kg",
    showParentByproduct: false,
    suggestSalesPrompt: false,
  },
];

const KIND_BY_ID = Object.fromEntries(PRODUCT_KIND_OPTIONS.map((k) => [k.id, k]));

export function getKindOption(id) {
  return KIND_BY_ID[id] || null;
}

/** Wizard step-1 options when adding from a segment tab. */
export function kindOptionsForSegment(segment) {
  if (!segment) return PRODUCT_KIND_OPTIONS;
  return PRODUCT_KIND_OPTIONS.filter((k) => k.segment === segment);
}

export function inferSegmentFromCategory(category) {
  if (category === "RAW_STOCK") return "MEAT";
  if (category === "PRODUCTION_ITEM") return "PREPARED";
  if (category === "CONSUMABLE") return "RETAIL";
  return "MEAT";
}

/**
 * Guess wizard kind from saved product (for edit).
 */
export function inferKindIdFromProduct(product) {
  if (!product) return "RAW_WEIGHT";
  if (product.segment === "KITCHEN_SUPPLY") return "KITCHEN_SUPPLY";
  const cat = product.category || "RAW_STOCK";
  const mode = product.saleMode || "WEIGHT";
  const seg = product.segment || inferSegmentFromCategory(cat);
  const bySeg = PRODUCT_KIND_OPTIONS.find(
    (k) => k.category === cat && k.saleMode === mode && k.segment === seg
  );
  if (bySeg) return bySeg.id;
  const match = PRODUCT_KIND_OPTIONS.find((k) => k.category === cat && k.saleMode === mode);
  return (
    match?.id ||
    (cat === "CONSUMABLE" ? "RETAIL_PACKAGED" : cat === "PRODUCTION_ITEM" ? "KITCHEN_PORTION" : "RAW_WEIGHT")
  );
}

export function applyKindToFormData(prev, kindId) {
  const k = getKindOption(kindId);
  if (!k) return prev;
  return {
    ...prev,
    category: k.category,
    saleMode: k.saleMode,
    segment: k.segment,
    unit: k.defaultUnit,
    salesPrompt: k.suggestSalesPrompt
      ? prev.salesPrompt || k.salesPromptExample || ""
      : prev.salesPrompt || "",
  };
}

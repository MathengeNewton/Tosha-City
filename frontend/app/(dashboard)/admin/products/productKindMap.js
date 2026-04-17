/**
 * Plain-language product "kinds" map to backend ProductCategory + ProductSaleMode.
 */

export const PRODUCT_KIND_OPTIONS = [
  {
    id: "RAW_WEIGHT",
    title: "Raw meat (by weight)",
    description: "Counter cuts sold on the scale — beef, pork, etc.",
    category: "RAW_STOCK",
    saleMode: "WEIGHT",
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
    defaultUnit: "piece",
    showParentByproduct: true,
    suggestSalesPrompt: false,
  },
  {
    id: "GROCERY",
    title: "Groceries & supplies",
    description: "Flour, salt, soy sauce, packets — stock used in cooking.",
    category: "CONSUMABLE",
    saleMode: "PIECE",
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
    defaultUnit: "kg",
    showParentByproduct: false,
    suggestSalesPrompt: false,
  },
];

const KIND_BY_ID = Object.fromEntries(PRODUCT_KIND_OPTIONS.map((k) => [k.id, k]));

export function getKindOption(id) {
  return KIND_BY_ID[id] || null;
}

/**
 * Guess wizard kind from saved product (for edit).
 */
export function inferKindIdFromProduct(product) {
  if (!product) return "RAW_WEIGHT";
  const cat = product.category || "RAW_STOCK";
  const mode = product.saleMode || "WEIGHT";
  const match = PRODUCT_KIND_OPTIONS.find(
    (k) => k.category === cat && k.saleMode === mode
  );
  return match?.id || (cat === "CONSUMABLE" ? "GROCERY" : cat === "PRODUCTION_ITEM" ? "KITCHEN_PORTION" : "RAW_WEIGHT");
}

export function applyKindToFormData(prev, kindId) {
  const k = getKindOption(kindId);
  if (!k) return prev;
  return {
    ...prev,
    category: k.category,
    saleMode: k.saleMode,
    unit: k.defaultUnit,
    salesPrompt: k.suggestSalesPrompt
      ? prev.salesPrompt || k.salesPromptExample || ""
      : prev.salesPrompt || "",
  };
}

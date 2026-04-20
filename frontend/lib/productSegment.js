/**
 * Product business segment (mirrors backend ProductSegment).
 * Used when API omits `segment` on older cached rows.
 */
export function segmentOfProduct(product) {
  if (!product) return "MEAT";
  if (product.segment) return product.segment;
  if (product.category === "RAW_STOCK") return "MEAT";
  if (product.category === "PRODUCTION_ITEM") return "PREPARED";
  if (product.category === "CONSUMABLE") return "RETAIL";
  return "MEAT";
}

/** Drinks / retail packs — counter handout on kitchen, not grill items. */
export function isRetailCounterProduct(product) {
  return segmentOfProduct(product) === "RETAIL";
}

/** Product catalog types — mirrors backend ProductCategory for admin UI. */

export const PRODUCT_TYPES = {
  RAW_STOCK: {
    value: "RAW_STOCK",
    label: "Meat / raw stock",
    shortLabel: "Raw stock",
    description: "Sold by weight (kg). Used in opening stock, incoming, and direct sales.",
    defaultUnit: "kg",
    saleMode: "WEIGHT",
    segment: "MEAT",
    unitOptions: [
      { value: "kg", label: "kg (kilograms)" },
      { value: "g", label: "g (grams)" },
    ],
    priceLabel: "Retail price per kg (KES)",
    wholesaleLabel: "Wholesale price per kg (KES)",
    showParentProduct: true,
    showWholesale: true,
  },
  PRODUCTION_ITEM: {
    value: "PRODUCTION_ITEM",
    label: "Production item",
    shortLabel: "Production",
    description:
      "Prepared on-site (e.g. mutura, soup). Sold per piece or portion; link to a recipe for stock production.",
    defaultUnit: "piece",
    saleMode: "UNIT",
    segment: "PREPARED",
    unitOptions: [
      { value: "piece", label: "piece" },
      { value: "portion", label: "portion" },
      { value: "serving", label: "serving" },
      { value: "plate", label: "plate" },
    ],
    priceLabel: "Retail price per piece (KES)",
    wholesaleLabel: "Wholesale price per piece (KES)",
    showParentProduct: false,
    showWholesale: true,
  },
};

export function productTypeKey(product) {
  if (product?.category === "PRODUCTION_ITEM") return "PRODUCTION_ITEM";
  return "RAW_STOCK";
}

export function configForProductType(typeKey) {
  return PRODUCT_TYPES[typeKey] || PRODUCT_TYPES.RAW_STOCK;
}

export function emptyProductForm(typeKey = "RAW_STOCK") {
  const cfg = configForProductType(typeKey);
  return {
    productType: typeKey,
    name: "",
    unit: cfg.defaultUnit,
    pricePerUnit: "",
    wholesalePricePerUnit: "",
    description: "",
    isActive: true,
    parentProductId: "",
  };
}

export function formFromProduct(product) {
  const typeKey = productTypeKey(product);
  return {
    productType: typeKey,
    name: product.name || "",
    unit: product.unit || configForProductType(typeKey).defaultUnit,
    pricePerUnit: String(product.defaultPrice ?? product.pricePerUnit ?? ""),
    wholesalePricePerUnit:
      product.wholesalePrice != null ? String(product.wholesalePrice) : "",
    description: product.description || "",
    isActive: product.isActive !== false,
    parentProductId: product.parentProductId ? String(product.parentProductId) : "",
  };
}

export function payloadFromForm(formData) {
  const cfg = configForProductType(formData.productType);
  const price = parseFloat(formData.pricePerUnit);
  const wholesaleInput = formData.wholesalePricePerUnit
    ? parseFloat(formData.wholesalePricePerUnit)
    : null;
  const wholesalePrice =
    wholesaleInput !== null && !Number.isNaN(wholesaleInput) ? wholesaleInput : price;

  const data = {
    name: formData.name.trim(),
    unit: formData.unit.trim(),
    defaultPrice: price,
    wholesalePrice: cfg.showWholesale ? wholesalePrice : price,
    category: cfg.value,
    segment: cfg.segment,
    saleMode: cfg.saleMode,
    isActive: formData.isActive,
  };

  if (cfg.showParentProduct && formData.parentProductId) {
    data.parentProductId = parseInt(formData.parentProductId, 10);
  }

  return data;
}

export function typeBadgeClass(typeKey) {
  return typeKey === "PRODUCTION_ITEM"
    ? "bg-amber-100 text-amber-900"
    : "bg-slate-100 text-slate-800";
}

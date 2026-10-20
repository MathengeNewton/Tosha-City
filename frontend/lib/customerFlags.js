/** Wholesale vs regular category; credit is optional on either. */
export function customerIsWholesale(customer) {
  if (!customer) return false;
  return !!(customer.isWholesale || customer.type === "WHOLESALE");
}

export function customerHasCredit(customer) {
  if (!customer) return false;
  return !!(customer.creditEnabled || customer.type === "CREDIT");
}

/**
 * Default unit price for a sale line (mirrors the API): wholesale customers get their special price
 * for the product if set, else the product wholesale price, else retail.
 * `specialPrices` maps productId -> price for the selected customer.
 */
export function customerUnitPrice(customer, product, specialPrices = {}) {
  const retail = product.defaultPrice ?? product.pricePerUnit ?? 0;
  if (!customerIsWholesale(customer)) return retail;
  return specialPrices[product.id] ?? product.wholesalePrice ?? retail;
}

export function customerCategoryLabel(customer) {
  return customerIsWholesale(customer) ? "Wholesale" : "Regular";
}

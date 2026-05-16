/** Wholesale vs regular category; credit is optional on either. */
export function customerIsWholesale(customer) {
  if (!customer) return false;
  return !!(customer.isWholesale || customer.type === "WHOLESALE");
}

export function customerHasCredit(customer) {
  if (!customer) return false;
  return !!(customer.creditEnabled || customer.type === "CREDIT");
}

export function customerCategoryLabel(customer) {
  return customerIsWholesale(customer) ? "Wholesale" : "Regular";
}

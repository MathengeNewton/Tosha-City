export const EXPENSE_CATEGORIES = [
  { value: "TRANSPORT", label: "Transport" },
  { value: "CASUAL_LABOUR", label: "Casual labour" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "CLEANING", label: "Cleaning supplies" },
  { value: "UTILITIES", label: "Water / electricity" },
  { value: "STAFF_MEALS", label: "Staff meals" },
  { value: "REPAIRS", label: "Repairs & maintenance" },
  { value: "OTHER", label: "Other" },
];

export const EXPENSE_PAYMENT_METHODS = [
  { value: "CASH", label: "Cash (till)" },
  { value: "MPESA", label: "M-Pesa" },
];

export function expenseCategoryLabel(value) {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label || value || "—";
}

export function expensePaymentLabel(value) {
  return EXPENSE_PAYMENT_METHODS.find((m) => m.value === value)?.label || value || "—";
}

export function formatKes(amount) {
  return `KES ${Number(amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function sumExpenses(expenses, paymentMethod) {
  return (expenses || [])
    .filter((e) => !paymentMethod || e.paymentMethod === paymentMethod)
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
}

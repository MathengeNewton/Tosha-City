"use client";
import { useState } from "react";
import NumberPad from "./NumberPad";
import { formatKes, isWeightProduct, lineCookingFee, lineQuantity } from "./saleLines";

const WEIGHT_PRESETS = [
  { value: 0.25, label: "¼" },
  { value: 0.5, label: "½" },
  { value: 0.75, label: "¾" },
  { value: 1, label: "1" },
  { value: 1.5, label: "1½" },
  { value: 2, label: "2" },
];
const AMOUNT_PRESETS = [100, 200, 300, 500, 1000, 2000].map((value) => ({ value, label: String(value) }));
const QTY_PRESETS = [1, 2, 3, 4, 5, 6].map((value) => ({ value, label: String(value) }));

function formatKg(kg) {
  return kg.toLocaleString("en-KE", { maximumFractionDigits: 3 });
}

/** One cart line: KES amount, quantity, price, optional kitchen cooking, remove. */
export default function SaleLineCard({
  line,
  products,
  onChange,
  onRemove,
  cookingFeePerKg,
  allowPriceEdit = false,
  compact = false,
}) {
  const [padField, setPadField] = useState(null);
  const product = products.find((p) => p.id === parseInt(line.productId, 10));
  const isWeightSale = isWeightProduct(product);
  const cookingFee = lineCookingFee(line, product, cookingFeePerKg);
  const kg = lineQuantity(line, product);
  const unit = product?.unit || "kg";

  const padProps = {
    quantity: isWeightSale
      ? { unit, presets: WEIGHT_PRESETS, step: 0.1, decimals: 3 }
      : { unit: "pcs", presets: QTY_PRESETS, step: 1, decimals: 2 },
    amount: { unit: "KES", presets: AMOUNT_PRESETS, step: 50, decimals: 0 },
    price: { unit: "KES", decimals: 0 },
  }[padField];

  const openPad = (field) => (e) => {
    e.target.blur();
    setPadField(field);
  };

  const fieldHeight = compact ? "min-h-[40px] py-1.5" : "min-h-[44px] py-2";
  const labelClass = `block text-[10px] font-semibold uppercase tracking-wide text-gray-500 ${compact ? "mb-0.5" : "mb-1"}`;
  const inputClass = (field, editable = true) =>
    `w-full rounded-lg border px-2 text-sm ${fieldHeight} cursor-pointer caret-transparent ${
      padField === field ? "border-blue-900 ring-2 ring-blue-900/30" : "border-gray-300"
    } ${editable ? "bg-white" : "bg-gray-100 text-gray-600"}`;

  const nameEl = product ? (
    <p className={`font-bold leading-snug text-gray-900 ${compact ? "text-base" : "text-sm"}`}>{product.name}</p>
  ) : (
    <select
      value={line.productId}
      onChange={(e) => onChange("productId", e.target.value)}
      className={`min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2 text-sm ${fieldHeight}`}
      required
    >
      <option value="">Select product</option>
      {products.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );

  const removeButton = (
    <button
      type="button"
      onClick={onRemove}
      className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-red-700 hover:bg-red-50"
    >
      Remove
    </button>
  );

  return (
    <div className={compact ? "rounded-xl border border-gray-200 bg-white px-4 py-3" : "rounded-xl border border-gray-200 bg-gray-50 p-3"}>
      {compact ? (
        <div className="flex flex-wrap items-end gap-x-4 gap-y-1 sm:flex-nowrap">
          <div className="flex min-w-0 basis-full items-center sm:basis-auto sm:flex-1 sm:self-center">{nameEl}</div>
          {renderFields("grid flex-1 grid-cols-3 gap-3 sm:w-[480px] sm:flex-none")}
          {removeButton}
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-start justify-between gap-2">
            {nameEl}
            {removeButton}
          </div>
          {renderFields("grid grid-cols-3 gap-2")}
        </>
      )}
      {isWeightSale && (
        <label
          className={`mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50 ${
            compact ? "min-h-[40px] px-3 py-1.5" : "min-h-[44px] px-3 py-2"
          }`}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-orange-900">
            <input
              type="checkbox"
              checked={!!line.cookInKitchen}
              onChange={(e) => onChange("cookInKitchen", e.target.checked)}
              className="h-5 w-5 accent-orange-600"
            />
            Cook in kitchen
            <span className="font-normal text-orange-800">
              ({formatKes(cookingFeePerKg)}/kg)
            </span>
          </span>
          {line.cookInKitchen && (
            <span className="text-sm font-bold tabular-nums text-orange-900">
              {kg > 0 ? `${formatKg(kg)} kg · ` : ""}+{formatKes(cookingFee)}
            </span>
          )}
        </label>
      )}
      {padField && (
        <NumberPad
          key={padField}
          title={padField === "price" ? `${product?.name || "Item"} · price` : product?.name || "Item"}
          tabs={
            isWeightSale && padField !== "price"
              ? [
                  { id: "quantity", label: unit },
                  { id: "amount", label: "KES" },
                ]
              : []
          }
          activeTab={padField}
          onTabChange={setPadField}
          value={padField === "quantity" && isWeightSale ? kg : line[padField]}
          onChange={(value) => onChange(padField, value)}
          summary={
            isWeightSale
              ? `${formatKg(kg)} ${unit} · KES ${formatKes(line.amount)}`
              : `KES ${formatKes(line.amount)}`
          }
          onClose={() => setPadField(null)}
          {...padProps}
        />
      )}
    </div>
  );

  function renderFields(className) {
    return (
      <div className={className}>
        <label className="block">
          <span className={labelClass}>KES</span>
          <input
            type="text"
            inputMode="none"
            value={line.amount}
            readOnly
            onFocus={isWeightSale ? openPad("amount") : undefined}
            required={isWeightSale}
            className={inputClass("amount", isWeightSale)}
          />
        </label>
        <label className="block">
          <span className={labelClass}>{isWeightSale ? unit : "Qty"}</span>
          <input
            type="text"
            inputMode="none"
            value={line.quantity ? formatKg(parseFloat(line.quantity)) : ""}
            readOnly
            onFocus={openPad("quantity")}
            className={inputClass("quantity")}
          />
        </label>
        {allowPriceEdit ? (
          <label className="block">
            <span className={labelClass}>Price</span>
            <input
              type="text"
              inputMode="none"
              value={line.price}
              readOnly
              onFocus={openPad("price")}
              className={inputClass("price")}
            />
          </label>
        ) : (
          <div>
            <span className={labelClass}>Price</span>
            <p
              className={`flex items-center rounded-lg bg-gray-100 px-2 text-sm font-semibold tabular-nums text-gray-800 ${fieldHeight}`}
            >
              {formatKes(line.price)}
            </p>
          </div>
        )}
      </div>
    );
  }
}

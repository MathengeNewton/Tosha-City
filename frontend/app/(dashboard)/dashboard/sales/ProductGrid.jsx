"use client";
import { useMemo, useState } from "react";
import { priceFor } from "./saleLines";

function formatOnHand(product) {
  const qty = Number(product?.available || 0);
  const shown = qty.toLocaleString("en-KE", { maximumFractionDigits: 3 });
  return `${shown} ${product?.unit || ""} left`.trim();
}

/** Searchable grid of sellable products; tapping one calls onPick. */
export default function ProductGrid({ products, customer, onPick, autoFocus = false, className = "" }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => (p.name || "").toLowerCase().includes(q));
  }, [products, search]);

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div className="border-b border-gray-200 px-3 py-3">
        <input
          type="search"
          placeholder="Search products"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-base min-h-[52px] focus:border-blue-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20"
          autoComplete="off"
          autoFocus={autoFocus}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <p className="py-16 text-center text-base text-gray-500">
            {search.trim() ? "No products match." : "Nothing left to sell in this session."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filtered.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => onPick(product)}
                className="flex min-h-[112px] flex-col items-start justify-between rounded-2xl border-2 border-gray-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.98] hover:border-blue-900"
              >
                <span className="line-clamp-2 text-base font-bold leading-snug text-gray-900">{product.name}</span>
                <span className="mt-1 text-sm font-semibold text-gray-600">{formatOnHand(product)}</span>
                <span className="mt-2 text-lg font-bold tabular-nums text-blue-900">
                  KES {Number(priceFor(product, customer)).toLocaleString("en-KE", { maximumFractionDigits: 0 })}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

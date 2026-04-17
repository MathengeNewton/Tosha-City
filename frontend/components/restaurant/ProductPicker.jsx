"use client";

import { useMemo, useState } from "react";

const CATEGORY_CHIPS = [
  { value: "ALL", label: "All" },
  { value: "RAW_STOCK", label: "Raw / meat" },
  { value: "PRODUCTION_ITEM", label: "Kitchen / plates" },
  { value: "CONSUMABLE", label: "Groceries" },
];

export default function ProductPicker({
  products,
  value,
  onChange,
  disabled = false,
  idPrefix = "pp",
}) {
  const [search, setSearch] = useState("");
  const [chip, setChip] = useState("ALL");

  const filtered = useMemo(() => {
    const active = (products || []).filter((p) => p.isActive !== false);
    const q = search.trim().toLowerCase();
    return active.filter((p) => {
      if (chip !== "ALL" && (p.category || "RAW_STOCK") !== chip) return false;
      if (!q) return true;
      return (p.name || "").toLowerCase().includes(q);
    });
  }, [products, search, chip]);

  const selected = (products || [])
    .filter((p) => p.isActive !== false)
    .find((p) => String(p.id) === String(value));

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-slate-600">Find product</label>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Type name…"
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200 px-3 py-3 text-base min-h-[48px] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
        id={`${idPrefix}-search`}
        autoComplete="off"
      />
      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_CHIPS.map((c) => (
          <button
            key={c.value}
            type="button"
            disabled={disabled}
            onClick={() => setChip(c.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold min-h-[36px] transition-colors ${
              chip === c.value
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 max-h-44 overflow-y-auto p-1.5 space-y-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500 px-2 py-4 text-center">No matches — try another category or search.</p>
        ) : (
          filtered.map((p) => {
            const isSel = String(p.id) === String(value);
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(String(p.id))}
                className={`w-full text-left rounded-lg px-3 py-3 text-sm font-medium min-h-[48px] transition-colors ${
                  isSel
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white text-slate-900 border border-transparent hover:border-slate-200"
                }`}
              >
                {p.name}
                <span className={`block text-xs font-normal mt-0.5 ${isSel ? "text-emerald-100" : "text-slate-500"}`}>
                  {(p.category || "").replace(/_/g, " ").toLowerCase()}
                </span>
              </button>
            );
          })
        )}
      </div>
      {selected ? (
        <p className="text-xs text-emerald-800 font-medium">Selected: {selected.name}</p>
      ) : (
        <p className="text-xs text-amber-700">Pick a product above.</p>
      )}
    </div>
  );
}

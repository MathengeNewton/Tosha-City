"use client";
import { useMemo, useState } from "react";
import { priceFor } from "./saleLines";

function formatQty(value) {
  return Number(value || 0).toLocaleString("en-KE", { maximumFractionDigits: 3 });
}

function formatOnHand(product) {
  return `${formatQty(product?.available)} ${product?.unit || ""} left`.trim();
}

function formatPrice(product, customer) {
  return `KES ${Number(priceFor(product, customer)).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

export function isKitchenProduct(product) {
  return product?.lane === "KITCHEN";
}

/** Low when a quarter or less of what was made is left, or two or fewer. */
export function kitchenStatus(product) {
  const left = Number(product?.available || 0);
  const made = Number(product?.made || 0);
  if (left <= 0) return made > 0 ? "soldOut" : "notCooked";
  if (made > 0 && (left <= 2 || left <= made * 0.25)) return "low";
  return "ok";
}

function KitchenTile({ product, customer, onPick }) {
  const status = kitchenStatus(product);
  const left = Number(product.available || 0);
  const made = Number(product.made || 0);
  const soldOut = status === "soldOut";
  const pct = made > 0 ? Math.min(100, Math.max(0, (left / made) * 100)) : 100;
  const barColor = status === "low" ? "bg-amber-500" : "bg-emerald-500";

  return (
    <button
      type="button"
      disabled={soldOut}
      onClick={() => onPick(product)}
      className={`flex min-h-[112px] flex-col items-start justify-between rounded-2xl border-2 bg-white p-4 text-left shadow-sm transition ${
        soldOut
          ? "cursor-not-allowed border-gray-200 opacity-60"
          : status === "low"
            ? "border-amber-300 hover:border-amber-500 active:scale-[0.98]"
            : "border-emerald-200 hover:border-blue-900 active:scale-[0.98]"
      }`}
    >
      <span className="line-clamp-2 text-base font-bold leading-snug text-gray-900">{product.name}</span>
      <span className="mt-2 block w-full">
        <span className="block h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <span className={`block h-full rounded-full ${soldOut ? "bg-gray-300" : barColor}`} style={{ width: `${soldOut ? 0 : pct}%` }} />
        </span>
        <span className="mt-1 flex w-full items-center justify-between gap-2 text-sm font-semibold">
          <span className={soldOut ? "text-gray-500" : "text-gray-700"}>
            {soldOut
              ? "Sold out · ask kitchen"
              : made > 0
                ? `${formatQty(left)} of ${formatQty(made)} ${product.unit || ""} left`
                : formatOnHand(product)}
          </span>
          {status === "low" && <span className="text-xs font-bold uppercase text-amber-700">Low</span>}
        </span>
      </span>
      <span className="mt-1 text-lg font-bold tabular-nums text-blue-900">{formatPrice(product, customer)}</span>
    </button>
  );
}

function CounterTile({ product, customer, onPick }) {
  return (
    <button
      type="button"
      onClick={() => onPick(product)}
      className="flex min-h-[112px] flex-col items-start justify-between rounded-2xl border-2 border-gray-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.98] hover:border-blue-900"
    >
      <span className="line-clamp-2 text-base font-bold leading-snug text-gray-900">{product.name}</span>
      <span className="mt-1 text-sm font-semibold text-gray-600">{formatOnHand(product)}</span>
      <span className="mt-2 text-lg font-bold tabular-nums text-blue-900">{formatPrice(product, customer)}</span>
    </button>
  );
}

const gridClass = "grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";

function LaneHeading({ title, hint }) {
  return (
    <div className="mb-2 flex items-baseline gap-2">
      <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">{title}</h3>
      <span className="text-xs text-gray-500">{hint}</span>
    </div>
  );
}

/**
 * Searchable grid of sellable products; tapping one calls onPick.
 * Kitchen output (lane KITCHEN) sits in its own lane above counter stock and
 * stays visible when sold out.
 */
export default function ProductGrid({ products, customer, onPick, autoFocus = false, className = "" }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => (p.name || "").toLowerCase().includes(q));
  }, [products, search]);

  const { kitchen, notCooked, counter } = useMemo(() => {
    const kitchenRows = filtered.filter(isKitchenProduct);
    const order = { ok: 0, low: 0, soldOut: 1 };
    return {
      kitchen: kitchenRows
        .filter((p) => kitchenStatus(p) !== "notCooked")
        .sort((a, b) => order[kitchenStatus(a)] - order[kitchenStatus(b)] || a.name.localeCompare(b.name)),
      notCooked: kitchenRows.filter((p) => kitchenStatus(p) === "notCooked"),
      counter: filtered.filter((p) => !isKitchenProduct(p) && Number(p.available) > 0),
    };
  }, [filtered]);

  const hasLanes = products.some(isKitchenProduct);
  const nothing = kitchen.length === 0 && counter.length === 0;

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
        {nothing && notCooked.length === 0 ? (
          <p className="py-16 text-center text-base text-gray-500">
            {search.trim() ? "No products match." : "Nothing left to sell in this session."}
          </p>
        ) : !hasLanes ? (
          <div className={gridClass}>
            {counter.map((product) => (
              <CounterTile key={product.id} product={product} customer={customer} onPick={onPick} />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {(kitchen.length > 0 || notCooked.length > 0) && (
              <section>
                <LaneHeading title="From the kitchen" hint="today's batches, left after sales" />
                {kitchen.length > 0 && (
                  <div className={gridClass}>
                    {kitchen.map((product) => (
                      <KitchenTile key={product.id} product={product} customer={customer} onPick={onPick} />
                    ))}
                  </div>
                )}
                {notCooked.length > 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    Not cooked yet today: {notCooked.map((p) => p.name).join(", ")}
                  </p>
                )}
              </section>
            )}
            {counter.length > 0 && (
              <section>
                <LaneHeading title="Counter" hint="counted at opening and deliveries" />
                <div className={gridClass}>
                  {counter.map((product) => (
                    <CounterTile key={product.id} product={product} customer={customer} onPick={onPick} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

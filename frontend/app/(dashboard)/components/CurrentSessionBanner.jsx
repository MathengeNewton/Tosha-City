"use client";

import { useMemo } from "react";
import { DayStages } from "../dashboard/stock/DayBoard";

function kes(value) {
  return `KES ${Number(value || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}

function fmt(value) {
  return Number(value || 0).toLocaleString("en-KE", { maximumFractionDigits: 2 });
}

function Metric({ label, value, sub, tone }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-xs text-gray-600">{label}</p>
      <p className={`mt-1 text-lg font-bold sm:text-xl ${tone === "warn" ? "text-amber-700" : "text-gray-900"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

/**
 * Today's open session on the Stock home: where the day is, what it has earned,
 * what the kitchen still has on the till, and what needs attention.
 * Props: session, sales (with items.product), flow (day-flow response), onViewSession(tab?),
 * showMoney (admin only: the day's revenue total).
 */
export default function CurrentSessionBanner({ session, sales, flow, onViewSession, showMoney = false }) {
  const salesByProduct = useMemo(() => {
    const byProduct = {};
    sales.forEach((sale) => {
      sale.items?.forEach((item) => {
        const name = item.product?.name || "Unknown";
        if (!byProduct[name]) byProduct[name] = { name, unit: item.product?.unit || "", quantity: 0, revenue: 0 };
        byProduct[name].quantity += parseFloat(item.quantity || 0);
        byProduct[name].revenue += parseFloat(item.totalPrice || 0);
      });
    });
    return Object.values(byProduct).sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  const summary = flow?.summary;
  const revenue = summary ? summary.revenue : sales.reduce((s, sale) => s + parseFloat(sale.totalAmount || 0), 0);
  const kitchenRows = (flow?.rows || []).filter((r) => r.lane === "KITCHEN" && Number(r.made) > 0);
  const attention = kitchenRows
    .filter((r) => {
      const left = Number(r.left || 0);
      const made = Number(r.made || 0);
      return left <= 0 || left <= 2 || left <= made * 0.25;
    })
    .map((r) => (Number(r.left) <= 0 ? `${r.name}: sold out` : `${r.name}: ${fmt(r.left)} left`));

  return (
    <div className="rounded-xl border-2 border-blue-900/20 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Today · {new Date(session.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
              {session.branch?.name ? ` · ${session.branch.name}` : ""}
            </h3>
          </div>
          <button
            onClick={() => onViewSession()}
            className="min-h-[44px] w-full shrink-0 whitespace-nowrap rounded-md bg-blue-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1e88b5] sm:w-auto"
          >
            Open day board
          </button>
        </div>

        {flow && <DayStages session={session} flow={flow} activeTab={null} onSelect={(tab) => onViewSession(tab)} />}

        <div className={`grid grid-cols-2 gap-3 ${showMoney ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          {showMoney && (
            <Metric
              label="Revenue"
              value={kes(revenue)}
              sub={summary?.unpaid > 0 ? `${kes(summary.unpaid)} unpaid` : `${sales.length} sales`}
            />
          )}
          <Metric
            label="Kitchen food on till"
            value={kes(summary?.kitchenValueLeft)}
            sub={kitchenRows.length > 0 ? `${kitchenRows.length} items cooked today` : "Nothing cooked yet"}
          />
          <Metric
            label="Sales"
            value={String(summary?.salesCount ?? sales.length)}
            sub={
              summary
                ? !showMoney && summary.unpaid > 0
                  ? `${summary.unpaidCount} unpaid · ${kes(summary.unpaid)}`
                  : `${summary.unpaidCount} unpaid`
                : undefined
            }
          />
          <Metric
            label="Needs attention"
            value={attention[0] || "All good"}
            sub={attention.length > 1 ? attention.slice(1, 3).join(" · ") : attention.length ? "Cook another batch" : undefined}
            tone={attention.length ? "warn" : undefined}
          />
        </div>

        <div className="flex max-h-[180px] flex-col">
          <p className="mb-2 shrink-0 text-xs font-medium text-gray-600">Selling today</p>
          {salesByProduct.length === 0 ? (
            <p className="text-sm text-gray-500">No sales yet today</p>
          ) : (
            <div className="-mx-1 min-h-0 flex-1 overflow-auto">
              <table className="min-w-full overflow-hidden rounded-xl border border-gray-200 text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr>
                    <th className="px-3 py-1.5 text-left text-xs font-medium uppercase text-gray-600">Product</th>
                    <th className="px-3 py-1.5 text-right text-xs font-medium uppercase text-gray-600">Qty</th>
                    <th className="px-3 py-1.5 text-right text-xs font-medium uppercase text-gray-600">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {salesByProduct.slice(0, 10).map((row) => (
                    <tr key={row.name}>
                      <td className="whitespace-nowrap px-3 py-1.5 text-gray-900">{row.name}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-gray-700">
                        {fmt(row.quantity)} {row.unit}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums text-gray-700">{kes(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {salesByProduct.length > 10 && (
                <p className="mt-1 text-xs text-gray-500">Top 10 by revenue · open the day board for the full list</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

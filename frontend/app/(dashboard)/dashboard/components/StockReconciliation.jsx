"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../../../lib/api";
import { formatKes } from "../../../../lib/expenses";
import { formatDate } from "../../../../lib/time";

const STATUS_STYLES = {
  SHORT: "bg-red-100 text-red-800 border-red-200",
  EXCESS: "bg-amber-100 text-amber-800 border-amber-200",
  BALANCED: "bg-green-100 text-green-800 border-green-200",
  PENDING: "bg-gray-100 text-gray-600 border-gray-200",
};

function kesWhole(amount) {
  return `KES ${Math.round(Math.abs(Number(amount || 0))).toLocaleString("en-KE")}`;
}

function qty(n) {
  return n == null ? "—" : Number(n).toFixed(2);
}

export function statusLabel(status, difference) {
  if (status === "SHORT") return `Short ${kesWhole(difference)}`;
  if (status === "EXCESS") return `Excess ${kesWhole(difference)}`;
  if (status === "BALANCED") return "Balanced";
  return "Waiting for closing stock";
}

export function ReconciliationBadge({ status, difference, large = false }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold whitespace-nowrap ${
        large ? "px-3 py-1 text-base" : "px-2 py-0.5 text-xs"
      } ${STATUS_STYLES[status] || STATUS_STYLES.PENDING}`}
    >
      {statusLabel(status, difference)}
    </span>
  );
}

function useReconciliation(sessionId, refreshKey) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.reports.getReconciliation(sessionId);
      setData(res.data);
    } catch (err) {
      setData(null);
      setError(err?.response?.status === 404 ? "No stock sessions yet." : "Could not load the stock check.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return { data, loading, error };
}

function PaymentsBreakdown({ payments }) {
  const items = [
    { label: "Cash", value: payments.cash },
    { label: "M-Pesa", value: payments.mpesa },
    { label: "Credit (owed)", value: payments.creditOutstanding },
  ];
  if (payments.other > 0) items.splice(2, 0, { label: "Other", value: payments.other });
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
      <span>
        Sales recorded: <span className="font-semibold text-gray-900">{formatKes(payments.totalSales)}</span>
      </span>
      {items.map((i) => (
        <span key={i.label}>
          {i.label}: <span className="font-medium text-gray-900">{formatKes(i.value)}</span>
        </span>
      ))}
    </div>
  );
}

/** Full per-product Short/Excess table for one session (Stock → session Overview). */
export function StockReconciliationTable({ sessionId, refreshKey }) {
  const { data, loading, error } = useReconciliation(sessionId, refreshKey);

  if (loading && !data) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm text-gray-500">Loading stock check…</div>
    );
  }
  if (error || !data) {
    return <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm text-red-600">{error}</div>;
  }
  if (data.rows.length === 0) return null;

  const { rows, totals, payments } = data;
  const th = "px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap";
  const td = "px-3 py-2 text-sm text-gray-700 whitespace-nowrap";

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Stock check: Short / Excess</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            (Opening + Incoming − Closing − Waste − Shared/used) = kg sold by stock count. That kg × price is
            compared with the kg recorded in sales (cash, M-Pesa and credit).
          </p>
        </div>
        <ReconciliationBadge status={totals.status} difference={totals.difference} large />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className={th}>Product</th>
              <th className={th}>Result</th>
              <th className={th}>Opening</th>
              <th className={th}>Incoming</th>
              <th className={th}>Closing</th>
              <th className={th}>Waste</th>
              <th className={th}>Shared / used</th>
              <th className={th}>Sold by stock</th>
              <th className={th}>Price</th>
              <th className={th}>Expected</th>
              <th className={th}>Sold in sales</th>
              <th className={th}>Sales value</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((r) => (
              <tr
                key={r.productId}
                className={r.status === "SHORT" ? "bg-red-50/60" : r.status === "EXCESS" ? "bg-amber-50/60" : ""}
              >
                <td className={`${td} font-medium text-gray-900`}>{r.product}</td>
                <td className={td}>
                  <ReconciliationBadge status={r.status} difference={r.difference} />
                </td>
                <td className={td}>{qty(r.opening)}</td>
                <td className={td}>{qty(r.incoming)}</td>
                <td className={td}>{qty(r.closing)}</td>
                <td className={`${td} text-red-600`}>{qty(r.wastage)}</td>
                <td className={td}>{qty(r.sharedOrUsed)}</td>
                <td className={`${td} font-semibold text-gray-900`}>
                  {r.soldByStock == null ? "—" : `${qty(r.soldByStock)} ${r.unit}`}
                </td>
                <td className={td}>{formatKes(r.price)}</td>
                <td className={td}>{r.expectedValue == null ? "—" : formatKes(r.expectedValue)}</td>
                <td className={td}>{`${qty(r.soldInSales)} ${r.unit}`}</td>
                <td
                  className={td}
                  title={
                    r.priceAdjustment > 0
                      ? `${formatKes(r.priceAdjustment)} below the standard price (wholesale / customer prices)`
                      : undefined
                  }
                >
                  {formatKes(r.salesValue)}
                  {r.priceAdjustment > 0 && <span className="ml-1 text-xs text-gray-500">*</span>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td className={`${td} font-semibold text-gray-900`}>
                Total{totals.productsPending > 0 ? ` (${totals.productsPending} waiting for closing stock)` : ""}
              </td>
              <td className={td}>
                <ReconciliationBadge status={totals.status} difference={totals.difference} />
              </td>
              <td className={td} colSpan={7} />
              <td className={`${td} font-semibold text-gray-900`}>{formatKes(totals.expectedValue)}</td>
              <td className={td} />
              <td className={`${td} font-semibold text-gray-900`}>{formatKes(totals.salesValue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <PaymentsBreakdown payments={payments} />
      {totals.priceAdjustment > 0 && (
        <p className="text-xs text-gray-500">
          * {formatKes(totals.priceAdjustment)} was sold below the standard price (wholesale or customer prices). This
          is not counted as short.
        </p>
      )}
    </div>
  );
}

/** Compact Short/Excess summary for the main dashboard. Shows the latest session when no sessionId is given. */
export function StockReconciliationCard({ sessionId, refreshKey }) {
  const { data, loading, error } = useReconciliation(sessionId, refreshKey);

  if (loading && !data) {
    return (
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 text-sm text-gray-500">
        Loading stock check…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 text-sm text-gray-500">{error}</div>
    );
  }

  const { session, rows, totals, payments } = data;

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Stock check</h3>
          <p className="text-sm text-gray-500">
            Session {formatDate(session.date)} · {session.status === "OPEN" ? "Open" : "Closed"}
          </p>
        </div>
        <ReconciliationBadge status={totals.status} difference={totals.difference} large />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">No stock recorded for this session yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {rows.map((r) => (
            <div key={r.productId} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-900">{r.product}</span>
                <span className="text-xs text-gray-500">
                  {r.soldByStock == null ? "" : `${qty(r.soldByStock)} ${r.unit} sold`}
                </span>
              </div>
              <div className="mt-2">
                <ReconciliationBadge status={r.status} difference={r.difference} />
              </div>
            </div>
          ))}
        </div>
      )}

      {totals.productsPending > 0 && totals.productsChecked === 0 && rows.length > 0 && (
        <p className="text-sm text-gray-500">Record closing stock to see whether the day is short or in excess.</p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-gray-100 pt-3">
        <PaymentsBreakdown payments={payments} />
        <Link
          href={`/dashboard/stock?sessionId=${session.id}&view=list`}
          className="text-sm font-medium text-blue-900 hover:underline"
        >
          See full check →
        </Link>
      </div>
    </div>
  );
}

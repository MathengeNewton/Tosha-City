"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";
import Link from "next/link";
import { useAuth, isKitchenOnlyAccount } from "../../../../contexts/AuthContext";
import { PageShell, PageHeader } from "../../components/shell";

/** Big-button labels for the next step in the kitchen line (grill / kitchen items). */
const LINE_NEXT_ACTION = {
  QUEUED: { next: "COOKING", label: "Start cooking" },
  COOKING: { next: "READY", label: "Mark ready" },
  READY: { next: "SERVED", label: "Mark served" },
};

/** Groceries, drinks, etc. — category CONSUMABLE on the product. */
function isCounterOnlyLine(line) {
  return line?.product?.category === "CONSUMABLE";
}

/** Single primary action for this line (API allows any status jump). */
function getKitchenLineAdvance(line) {
  const st = line?.status;
  if (!st || st === "SERVED") return null;
  if (isCounterOnlyLine(line)) {
    if (st === "QUEUED") return { next: "SERVED", label: "Hand out (no cooking)" };
    if (st === "COOKING" || st === "READY") return { next: "SERVED", label: "Mark served" };
    return null;
  }
  const step = LINE_NEXT_ACTION[st];
  if (!step) return null;
  return { next: step.next, label: step.label };
}

function kitchenStatusLabel(line) {
  const st = line?.status;
  if (!st) return "—";
  if (isCounterOnlyLine(line) && st === "QUEUED") return "Counter queue";
  return st;
}

export default function KitchenPage() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const kitchenOnlyUser = isKitchenOnlyAccount(user);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [currentSession, setCurrentSession] = useState(null);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const effectiveBranchId = isAdmin ? selectedBranchId : user?.branchId ? String(user.branchId) : "";

  const load = useCallback(async () => {
    const branchId = effectiveBranchId;
    if (!branchId) return;
    try {
      const sessionRes = await apiClient.stockSessions.getCurrent({ branchId });
      const session = sessionRes.data;
      setCurrentSession(session);
      if (!session?.id) {
        setOrders([]);
        setSummary(null);
        return;
      }
      const [ordersRes, sumRes] = await Promise.all([
        apiClient.restaurantOrders.getAll({ sessionId: session.id, status: "OPEN" }),
        apiClient.restaurantOrders.getKitchenSummary(session.id),
      ]);
      setOrders(ordersRes.data || []);
      setSummary(sumRes.data);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to load kitchen data");
    } finally {
      setLoading(false);
    }
  }, [effectiveBranchId]);

  useEffect(() => {
    (async () => {
      if (isAdmin) {
        try {
          const res = await apiClient.branches.getAll({ activeOnly: true });
          const pork = (res.data || []).filter((b) => b.type === "PORK_BUTCHERY");
          setBranches(pork);
          if (pork.length && !selectedBranchId) {
            setSelectedBranchId(String(pork[0].id));
          }
        } catch {
          toast.error("Failed to load branches");
        }
      } else if (user?.branchId) {
        setSelectedBranchId(String(user.branchId));
      }
    })();
  }, [isAdmin, user?.branchId]);

  useEffect(() => {
    if (!effectiveBranchId) return;
    setLoading(true);
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [effectiveBranchId, load]);

  const advanceLine = async (line, nextStatus) => {
    try {
      await apiClient.restaurantOrders.updateLineStatus(line.id, { status: nextStatus });
      toast.success("Updated");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Update failed");
    }
  };

  const billOrder = async (orderId) => {
    try {
      await apiClient.restaurantOrders.bill(orderId, { paymentMethod: "CASH" });
      toast.success("Bill created — record payment from Sales if needed");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Billing failed");
    }
  };

  const voidOrder = async (orderId) => {
    if (!confirm("Void this open order?")) return;
    try {
      await apiClient.restaurantOrders.void(orderId);
      toast.success("Order voided");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Void failed");
    }
  };

  const porkOnly =
    isAdmin && branches.length > 0
      ? true
      : user?.branch?.type === "PORK_BUTCHERY";

  if (!porkOnly && !isAdmin) {
    return (
      <PageShell>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-gray-600">Kitchen board is only for pork butchery branches.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-full space-y-5 sm:space-y-6">
      <PageHeader
        title="Kitchen"
        subtitle={
          kitchenOnlyUser
            ? "Line prep only — billing and new orders are done at the till. Updates every 8s."
            : "Open orders for the current session — updates every 8s. Tap a big button to move a dish forward."
        }
      >
        {!kitchenOnlyUser ? (
          <Link
            href="/dashboard/restaurant-orders/new"
            className="inline-flex items-center justify-center rounded-xl bg-green-600 px-6 py-4 text-base font-semibold text-white shadow-sm hover:bg-green-700 active:bg-green-800 min-h-[52px] touch-manipulation"
          >
            New table order
          </Link>
        ) : null}
      </PageHeader>

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-700">Pork branch</label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="min-h-[48px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-base touch-manipulation"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && !currentSession && (
        <p className="text-gray-500">Loading…</p>
      )}

      {!loading && !currentSession?.id && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-sm shadow-sm">
          No open stock session for this branch. Open a session on{" "}
          <Link href="/dashboard/stock" className="underline font-medium">
            Stock Session
          </Link>{" "}
          first.
        </div>
      )}

      {summary && currentSession?.id && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Dine-in orders</p>
            <p className="text-3xl font-bold tabular-nums">{summary.dineInOrders}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Takeaway orders</p>
            <p className="text-3xl font-bold tabular-nums">{summary.takeawayOrders}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Session</p>
            <p className="text-xl font-bold tabular-nums">#{currentSession.id}</p>
          </div>
        </div>
      )}

      {summary?.byProduct?.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-base font-semibold text-gray-900 sm:px-5 sm:py-3.5">
            Prep (unserved)
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-base">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 sm:px-5 sm:py-3.5">Product</th>
                  <th className="px-4 py-3 sm:px-5 sm:py-3.5">Qty</th>
                  <th className="px-4 py-3 sm:px-5 sm:py-3.5">Queued</th>
                  <th className="px-4 py-3 sm:px-5 sm:py-3.5">Cooking</th>
                  <th className="px-4 py-3 sm:px-5 sm:py-3.5">Ready</th>
                </tr>
              </thead>
              <tbody>
                {summary.byProduct.map((row) => (
                  <tr key={row.productId} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3.5 font-semibold text-gray-900 sm:px-5 sm:py-4">
                      {row.productName}
                      {row.skipCookPrep ? (
                        <span className="ml-2 align-middle text-xs font-semibold normal-case text-teal-700">
                          (no grill)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-gray-800 sm:px-5 sm:py-4">{row.quantity}</td>
                    <td className="px-4 py-3.5 tabular-nums sm:px-5 sm:py-4">{row.queued}</td>
                    <td className="px-4 py-3.5 tabular-nums sm:px-5 sm:py-4">{row.cooking}</td>
                    <td className="px-4 py-3.5 tabular-nums sm:px-5 sm:py-4">{row.ready}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="space-y-5 sm:space-y-6">
        {orders.map((order) => (
          <div
            key={order.id}
            className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-sm"
          >
            <div className="flex flex-col gap-4 border-b-2 border-gray-200 bg-gray-50 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:px-5 sm:py-5">
              <div className="min-w-0 space-y-1">
                <p className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">{order.orderNumber}</p>
                <p className="text-lg text-gray-600">
                  {order.serviceType === "DINE_IN" ? "Dine-in" : "Takeaway"}
                  {order.tableLabel ? ` · ${order.tableLabel}` : ""}
                </p>
              </div>
              {!kitchenOnlyUser ? (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[280px] sm:flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => billOrder(order.id)}
                    className="w-full rounded-xl bg-blue-900 px-5 py-4 text-center text-lg font-bold text-white shadow-sm hover:bg-blue-800 active:bg-blue-950 min-h-[56px] touch-manipulation sm:min-h-[60px]"
                  >
                    Bill — create sale
                  </button>
                  <button
                    type="button"
                    onClick={() => voidOrder(order.id)}
                    className="w-full rounded-xl border-2 border-red-300 bg-red-50 px-5 py-3.5 text-center text-base font-semibold text-red-800 hover:bg-red-100 active:bg-red-200 min-h-[48px] touch-manipulation"
                  >
                    Void whole order
                  </button>
                </div>
              ) : null}
            </div>
            <ul className="divide-y-2 divide-gray-100 p-3 sm:p-4">
              {(order.lines || []).map((line) => {
                const advance = getKitchenLineAdvance(line);
                const statusTone =
                  line.status === "SERVED"
                    ? "bg-green-200 text-green-900"
                    : line.status === "READY"
                      ? "bg-amber-200 text-amber-950"
                      : line.status === "COOKING"
                        ? "bg-orange-200 text-orange-950"
                        : isCounterOnlyLine(line)
                          ? "bg-teal-200 text-teal-950"
                          : "bg-slate-200 text-slate-900";
                return (
                  <li key={line.id} className="py-3 first:pt-0 last:pb-0 sm:py-4">
                    <div className="flex flex-col gap-4 rounded-2xl border-2 border-gray-200 bg-gray-50/90 p-4 sm:p-5">
                      <div className="min-w-0 space-y-2">
                        <p className="text-xl font-bold leading-snug text-gray-900 sm:text-2xl">
                          {line.product?.name || "Product"}
                        </p>
                        <p className="text-lg text-gray-700">
                          × {line.quantity} @ {Number(line.unitPrice).toFixed(0)} KES
                        </p>
                        {isCounterOnlyLine(line) ? (
                          <p className="text-base font-medium text-teal-900">
                            Drinks / groceries — no cooking step.
                          </p>
                        ) : null}
                        <span
                          className={`inline-flex max-w-full items-center rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wide ${statusTone}`}
                        >
                          {kitchenStatusLabel(line)}
                        </span>
                      </div>
                      {advance ? (
                        <button
                          type="button"
                          onClick={() => advanceLine(line, advance.next)}
                          className="w-full rounded-2xl bg-blue-900 px-4 py-5 text-center text-xl font-bold leading-tight text-white shadow-md hover:bg-blue-800 active:bg-blue-950 min-h-[72px] touch-manipulation sm:min-h-[80px] sm:text-2xl sm:py-6"
                        >
                          {advance.label}
                        </button>
                      ) : line.status === "SERVED" ? (
                        <div className="flex min-h-[56px] items-center justify-center rounded-2xl border-2 border-green-300 bg-green-50 px-4 py-4 text-center text-lg font-semibold text-green-900">
                          Done — served
                        </div>
                      ) : (
                        <div className="flex min-h-[48px] items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-900">
                          Status: {line.status || "—"} (no tap action)
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {orders.length === 0 && currentSession?.id && !loading && (
        <p className="text-gray-500 text-sm">No open restaurant orders for this session.</p>
      )}
    </PageShell>
  );
}

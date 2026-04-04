"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";
import Link from "next/link";
import { useAuth } from "../../../../contexts/AuthContext";

const LINE_FLOW = ["QUEUED", "COOKING", "READY", "SERVED"];

export default function KitchenPage() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
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
      <div className="p-6">
        <p className="text-gray-600">Kitchen board is only for pork butchery branches.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kitchen</h1>
          <p className="text-gray-600 text-sm mt-1">
            Open orders for the current session — updates every 8s.
          </p>
        </div>
        <Link
          href="/dashboard/restaurant-orders/new"
          className="inline-flex justify-center bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
        >
          New table order
        </Link>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-700">Pork branch</label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
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
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900 text-sm">
          No open stock session for this branch. Open a session on{" "}
          <Link href="/dashboard/stock" className="underline font-medium">
            Stock Session
          </Link>{" "}
          first.
        </div>
      )}

      {summary && currentSession?.id && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase">Dine-in orders</p>
            <p className="text-2xl font-semibold">{summary.dineInOrders}</p>
          </div>
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase">Takeaway orders</p>
            <p className="text-2xl font-semibold">{summary.takeawayOrders}</p>
          </div>
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase">Session</p>
            <p className="text-sm font-medium">#{currentSession.id}</p>
          </div>
        </div>
      )}

      {summary?.byProduct?.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 font-medium text-sm">Prep (unserved)</div>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Qty</th>
                <th className="px-4 py-2">Queued</th>
                <th className="px-4 py-2">Cooking</th>
                <th className="px-4 py-2">Ready</th>
              </tr>
            </thead>
            <tbody>
              {summary.byProduct.map((row) => (
                <tr key={row.productId} className="border-b">
                  <td className="px-4 py-2">{row.productName}</td>
                  <td className="px-4 py-2">{row.quantity}</td>
                  <td className="px-4 py-2">{row.queued}</td>
                  <td className="px-4 py-2">{row.cooking}</td>
                  <td className="px-4 py-2">{row.ready}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="flex flex-wrap justify-between gap-2 px-4 py-3 bg-slate-50 border-b">
              <div>
                <span className="font-semibold">{order.orderNumber}</span>
                <span className="text-gray-500 text-sm ml-2">
                  {order.serviceType === "DINE_IN" ? "Dine-in" : "Takeaway"}
                  {order.tableLabel ? ` · Table ${order.tableLabel}` : ""}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => billOrder(order.id)}
                  className="text-sm bg-blue-900 text-white px-3 py-1.5 rounded-md hover:bg-blue-800"
                >
                  Bill (create sale)
                </button>
                <button
                  type="button"
                  onClick={() => voidOrder(order.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Void
                </button>
              </div>
            </div>
            <ul className="divide-y">
              {(order.lines || []).map((line) => {
                const idx = LINE_FLOW.indexOf(line.status);
                const next = idx >= 0 && idx < LINE_FLOW.length - 1 ? LINE_FLOW[idx + 1] : null;
                return (
                  <li key={line.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-medium">{line.product?.name || "Product"}</span>
                      <span className="text-gray-600 ml-2">
                        × {line.quantity} @ {Number(line.unitPrice).toFixed(0)} KES
                      </span>
                      <span
                        className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                          line.status === "SERVED"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {line.status}
                      </span>
                    </div>
                    {next && (
                      <button
                        type="button"
                        onClick={() => advanceLine(line, next)}
                        className="text-sm border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50"
                      >
                        → {next}
                      </button>
                    )}
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
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "../../../../../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../../../../../contexts/AuthContext";

export default function NewRestaurantOrderPage() {
  const router = useRouter();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [session, setSession] = useState(null);
  const [products, setProducts] = useState([]);
  const [serviceType, setServiceType] = useState("DINE_IN");
  const [tableLabel, setTableLabel] = useState("");
  const [lines, setLines] = useState([{ productId: "", quantity: "1", notes: "" }]);
  const [submitting, setSubmitting] = useState(false);

  const effectiveBranchId = isAdmin ? selectedBranchId : user?.branchId ? String(user.branchId) : "";

  useEffect(() => {
    apiClient.products.getActive().then((res) => setProducts(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      if (isAdmin) {
        const res = await apiClient.branches.getAll({ activeOnly: true });
        const pork = (res.data || []).filter((b) => b.type === "PORK_BUTCHERY");
        setBranches(pork);
        if (pork.length) setSelectedBranchId(String(pork[0].id));
      } else if (user?.branchId) {
        setSelectedBranchId(String(user.branchId));
      }
    })();
  }, [isAdmin, user?.branchId]);

  useEffect(() => {
    if (!effectiveBranchId) return;
    (async () => {
      try {
        const res = await apiClient.stockSessions.getCurrent({ branchId: effectiveBranchId });
        setSession(res.data);
      } catch {
        setSession(null);
      }
    })();
  }, [effectiveBranchId]);

  const addLine = () => {
    setLines([...lines, { productId: "", quantity: "1", notes: "" }]);
  };

  const updateLine = (i, field, val) => {
    const next = [...lines];
    next[i] = { ...next[i], [field]: val };
    setLines(next);
  };

  const removeLine = (i) => {
    setLines(lines.filter((_, j) => j !== i));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!session?.id) {
      toast.error("Open a stock session for this branch first.");
      return;
    }
    const payloadLines = lines
      .filter((l) => l.productId)
      .map((l) => ({
        productId: parseInt(l.productId, 10),
        quantity: parseFloat(l.quantity),
        notes: l.notes || undefined,
      }));
    if (!payloadLines.length) {
      toast.error("Add at least one line with a product.");
      return;
    }
    try {
      setSubmitting(true);
      await apiClient.restaurantOrders.create({
        sessionId: session.id,
        serviceType,
        tableLabel: tableLabel || undefined,
        lines: payloadLines,
      });
      toast.success("Order sent to kitchen");
      router.push("/dashboard/table-orders");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const allowed =
    isAdmin && branches.length > 0 ? true : user?.branch?.type === "PORK_BUTCHERY";

  if (!allowed && !isAdmin) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Table orders are only for pork butchery branches.</p>
        <Link
          href={isAdmin ? "/admin/dashboard" : "/dashboard"}
          className="text-blue-700 underline mt-2 inline-block"
        >
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New table order</h1>
        <p className="text-gray-600 text-sm mt-1">Creates a kitchen ticket for the current session.</p>
      </div>

      {isAdmin && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {!session?.id && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
          No open session. Open one under{" "}
          <Link href="/dashboard/stock" className="underline font-medium">
            Stock Session
          </Link>
          .
        </div>
      )}

      <form onSubmit={submit} className="space-y-4 bg-white rounded-xl border p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="DINE_IN">Dine-in</option>
              <option value="TAKEAWAY">Takeaway</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Table / label</label>
            <input
              value={tableLabel}
              onChange={(e) => setTableLabel(e.target.value)}
              placeholder="e.g. 3"
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-medium text-sm">Lines</span>
            <button type="button" onClick={addLine} className="text-sm text-blue-800 hover:underline">
              + Add line
            </button>
          </div>
          {lines.map((line, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-end border-b border-gray-100 pb-3">
              <div className="flex-1 min-w-[140px]">
                <label className="text-xs text-gray-500">Product</label>
                <select
                  value={line.productId}
                  onChange={(e) => updateLine(i, "productId", e.target.value)}
                  className="w-full border rounded-md px-2 py-2 text-sm"
                >
                  <option value="">Select…</option>
                  {products
                    .filter((p) => p.isActive !== false)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="w-24">
                <label className="text-xs text-gray-500">Qty</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={line.quantity}
                  onChange={(e) => updateLine(i, "quantity", e.target.value)}
                  className="w-full border rounded-md px-2 py-2 text-sm"
                />
              </div>
              <div className="flex-1 min-w-[100px]">
                <label className="text-xs text-gray-500">Notes</label>
                <input
                  value={line.notes}
                  onChange={(e) => updateLine(i, "notes", e.target.value)}
                  className="w-full border rounded-md px-2 py-2 text-sm"
                />
              </div>
              {lines.length > 1 && (
                <button type="button" onClick={() => removeLine(i)} className="text-red-600 text-sm pb-2">
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || !session?.id}
            className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send to kitchen"}
          </button>
          <Link href="/dashboard/kitchen" className="px-4 py-2.5 text-gray-700 border rounded-lg">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

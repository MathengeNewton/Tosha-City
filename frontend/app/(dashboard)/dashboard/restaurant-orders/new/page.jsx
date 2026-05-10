"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "../../../../../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../../../../../contexts/AuthContext";
import ProductPicker from "../../../../../components/restaurant/ProductPicker";
import { PageShell, PageHeader } from "../../../components/shell";

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
    if (!effectiveBranchId) {
      setProducts([]);
      return;
    }
    apiClient.products
      .getActive({ branchId: effectiveBranchId })
      .then((res) => setProducts(res.data || []))
      .catch(() => {});
  }, [effectiveBranchId]);

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

  const duplicateLastProduct = () => {
    const last = lines[lines.length - 1];
    if (!last?.productId) {
      toast.info("Pick a product on the last line first.");
      return;
    }
    setLines([...lines, { productId: last.productId, quantity: "1", notes: "" }]);
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
      <PageShell>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm max-w-lg">
          <p className="text-gray-600">Table orders are only for pork butchery branches.</p>
          <Link
            href={isAdmin ? "/admin/dashboard" : "/dashboard"}
            className="text-blue-900 hover:text-[#1e88b5] underline mt-2 inline-block font-medium"
          >
            Back
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-2xl sm:max-w-3xl space-y-5 pb-36 pt-2">
      <PageHeader
        title="New table order"
        subtitle={`Sends a ticket to the kitchen for today's session. Add dishes below — table number helps wait staff.`}
      />

      {isAdmin && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-3 text-base min-h-[48px] focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
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
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          No open session. Open one under{" "}
          <Link href="/dashboard/stock" className="underline font-semibold">
            Stock session
          </Link>{" "}
          first.
        </div>
      )}

      <form id="new-table-order-form" onSubmit={submit} className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Service</label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-base min-h-[48px]"
              >
                <option value="DINE_IN">Dine-in</option>
                <option value="TAKEAWAY">Takeaway</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Table / label</label>
              <input
                value={tableLabel}
                onChange={(e) => setTableLabel(e.target.value)}
                placeholder="e.g. 3 or Counter"
                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-base min-h-[48px]"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-slate-900">Dishes on this ticket</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={duplicateLastProduct}
                className="text-sm font-semibold text-slate-700 rounded-xl border border-slate-200 px-3 py-2 min-h-[40px] hover:bg-slate-50"
              >
                Same again
              </button>
              <button
                type="button"
                onClick={addLine}
                className="text-sm font-semibold text-emerald-800 rounded-xl border-2 border-emerald-600 px-3 py-2 min-h-[40px] hover:bg-emerald-50"
              >
                + Add line
              </button>
            </div>
          </div>

          {lines.map((line, i) => (
            <div
              key={`line-${i}`}
              className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 space-y-3 shadow-sm"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Item {i + 1}</span>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="text-sm font-medium text-red-600 min-h-[40px] px-2"
                  >
                    Remove
                  </button>
                )}
              </div>
              <ProductPicker
                products={products}
                value={line.productId}
                onChange={(id) => updateLine(i, "productId", id)}
                disabled={!session?.id}
                idPrefix={`line-${i}`}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={line.quantity}
                    onChange={(e) => updateLine(i, "quantity", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-base min-h-[48px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Notes for kitchen</label>
                  <input
                    value={line.notes}
                    onChange={(e) => updateLine(i, "notes", e.target.value)}
                    placeholder="e.g. No salt, extra ugali"
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-base min-h-[48px]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 z-20 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-3 pb-4 bg-white/95 backdrop-blur border-t border-slate-200 mt-8 flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            form="new-table-order-form"
            disabled={submitting || !session?.id}
            className="flex-1 rounded-xl bg-emerald-600 text-white px-5 py-3.5 text-base font-bold min-h-[52px] shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send to kitchen"}
          </button>
          <Link
            href="/dashboard/table-orders"
            className="inline-flex flex-1 sm:flex-none items-center justify-center rounded-xl border-2 border-slate-200 text-slate-800 px-5 py-3.5 text-base font-semibold min-h-[52px] hover:bg-slate-50"
          >
            Back to table orders
          </Link>
        </div>
      </form>
    </PageShell>
  );
}

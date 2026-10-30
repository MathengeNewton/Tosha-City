"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../../../../contexts/AuthContext";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import ProductPicker from "../../../../components/restaurant/ProductPicker";
import { isRetailCounterProduct } from "../../../../lib/productSegment";
import { PageShell, PageHeader } from "../../components/shell";
import PaymentPicker, { emptyPayment, paymentPayload, paymentProblem } from "../sales/PaymentPicker";

const fmtKes = (n) =>
  `${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} KES`;

function orderStatusBadge(status) {
  if (status === "OPEN") return { label: "Kitchen", sub: "Order open", pill: "bg-emerald-100 text-emerald-900" };
  if (status === "BILLED") return { label: "Billed", sub: "Check payment if needed", pill: "bg-blue-100 text-blue-900" };
  if (status === "VOID") return { label: "Voided", sub: "Cancelled", pill: "bg-slate-200 text-slate-700" };
  return { label: status, sub: "", pill: "bg-slate-200 text-slate-700" };
}

function lineStatusLabel(st, line) {
  if (st === "QUEUED" && isRetailCounterProduct(line?.product)) {
    return "Counter / no cooking";
  }
  const m = {
    QUEUED: "Waiting to cook",
    COOKING: "Cooking",
    READY: "Ready to serve",
    SERVED: "Served",
  };
  return m[st] || st;
}

function lineStatusPillClass(st, line) {
  switch (st) {
    case "QUEUED":
      if (isRetailCounterProduct(line?.product)) {
        return "bg-teal-100 text-teal-900 ring-1 ring-teal-200/80";
      }
      return "bg-amber-100 text-amber-900 ring-1 ring-amber-200/80";
    case "COOKING":
      return "bg-blue-100 text-blue-900 ring-1 ring-blue-200/80";
    case "READY":
      return "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80";
    case "SERVED":
      return "bg-gray-100 text-gray-700 ring-1 ring-gray-200/80";
    default:
      return "bg-gray-100 text-gray-700 ring-1 ring-gray-200/80";
  }
}

const orderModalField =
  "w-full min-h-[44px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#0D47A1] focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/25";

function orderLineSummary(order) {
  const lines = order?.lines || [];
  const count = lines.length;
  const total = lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unitPrice || 0), 0);
  return { count, total };
}

export default function TableOrdersPage() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [session, setSession] = useState(null);
  const [listTab, setListTab] = useState("active");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [staffOptions, setStaffOptions] = useState([]);
  const [products, setProducts] = useState([]);

  const [metaTable, setMetaTable] = useState("");
  const [metaNotes, setMetaNotes] = useState("");
  const [metaStaff, setMetaStaff] = useState("");

  const [addProductId, setAddProductId] = useState("");
  const [addQty, setAddQty] = useState("1");
  const [addNotes, setAddNotes] = useState("");

  const [billMethod, setBillMethod] = useState("CASH");
  const [billIncomplete, setBillIncomplete] = useState(false);

  const [payForm, setPayForm] = useState(emptyPayment("CASH"));
  const [saleSettings, setSaleSettings] = useState(null);

  useEffect(() => {
    apiClient.saleSettings
      .get()
      .then((res) => setSaleSettings(res.data))
      .catch(() => setSaleSettings(null));
  }, []);

  const linkedSaleId = detail?.linkedSale?.id;
  const linkedSaleMethod = detail?.linkedSale?.paymentMethod;
  useEffect(() => {
    setPayForm(emptyPayment(linkedSaleMethod));
  }, [linkedSaleId, linkedSaleMethod]);

  const effectiveBranchId = isAdmin ? selectedBranchId : user?.branchId ? String(user.branchId) : "";

  const loadList = useCallback(async () => {
    if (!session?.id) {
      setOrders([]);
      return;
    }
    const list = listTab === "active" ? "active" : "closed";
    const res = await apiClient.restaurantOrders.getAll({
      sessionId: session.id,
      list,
    });
    setOrders(res.data || []);
  }, [session?.id, listTab]);

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
        if (pork.length && !selectedBranchId) setSelectedBranchId(String(pork[0].id));
      } else if (user?.branchId) {
        setSelectedBranchId(String(user.branchId));
      }
    })();
  }, [isAdmin, user?.branchId, selectedBranchId]);

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

  useEffect(() => {
    if (!effectiveBranchId) return;
    (async () => {
      try {
        const res = await apiClient.restaurantOrders.getStaffOptions(
          isAdmin ? { branchId: effectiveBranchId } : {}
        );
        setStaffOptions(res.data || []);
      } catch {
        setStaffOptions([]);
      }
    })();
  }, [effectiveBranchId, isAdmin]);

  useEffect(() => {
    if (!session?.id) {
      setLoading(false);
      setOrders([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await loadList();
      } catch (e) {
        if (!cancelled) toast.error(e.response?.data?.message || "Failed to load orders");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.id, loadList]);

  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      try {
        const res = await apiClient.restaurantOrders.getById(detailId);
        if (cancelled) return;
        const o = res.data;
        setDetail(o);
        setMetaTable(o.tableLabel || "");
        setMetaNotes(o.notes || "");
        setMetaStaff(o.assignedStaffId ? String(o.assignedStaffId) : "");
      } catch (e) {
        if (!cancelled) toast.error(e.response?.data?.message || "Failed to load order");
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailId]);

  const refreshDetailAndList = async () => {
    await loadList();
    if (detailId) {
      const res = await apiClient.restaurantOrders.getById(detailId);
      setDetail(res.data);
      const o = res.data;
      setMetaTable(o.tableLabel || "");
      setMetaNotes(o.notes || "");
      setMetaStaff(o.assignedStaffId ? String(o.assignedStaffId) : "");
    }
  };

  const saveMeta = async () => {
    if (!detailId) return;
    try {
      await apiClient.restaurantOrders.update(detailId, {
        tableLabel: metaTable || null,
        notes: metaNotes || null,
        assignedStaffId: metaStaff ? parseInt(metaStaff, 10) : null,
      });
      toast.success("Saved");
      await refreshDetailAndList();
    } catch (e) {
      toast.error(e.response?.data?.message || "Save failed");
    }
  };

  const addLines = async () => {
    if (!detail?.id || !addProductId) return;
    try {
      await apiClient.restaurantOrders.addLines(detail.id, {
        lines: [
          {
            productId: parseInt(addProductId, 10),
            quantity: parseFloat(addQty) || 1,
            notes: addNotes || undefined,
          },
        ],
      });
      toast.success("Line added");
      setAddNotes("");
      setAddProductId("");
      setAddQty("1");
      await refreshDetailAndList();
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not add line");
    }
  };

  const updateQueuedLine = async (line) => {
    try {
      const qtyEl = document.getElementById(`line-qty-${line.id}`);
      const priceEl = document.getElementById(`line-price-${line.id}`);
      const notesEl = document.getElementById(`line-notes-${line.id}`);
      const quantity = qtyEl ? parseFloat(qtyEl.value) : Number(line.quantity);
      const unitPrice = priceEl ? parseFloat(priceEl.value) : Number(line.unitPrice);
      const notes = notesEl ? notesEl.value : line.notes || null;
      await apiClient.restaurantOrders.updateLine(line.id, {
        quantity,
        unitPrice,
        notes: notes || null,
      });
      toast.success("Line updated");
      await refreshDetailAndList();
    } catch (e) {
      toast.error(e.response?.data?.message || "Update failed");
    }
  };

  const removeLine = async (lineId) => {
    if (!confirm("Remove this line?")) return;
    try {
      await apiClient.restaurantOrders.deleteLine(lineId);
      toast.success("Removed");
      await refreshDetailAndList();
    } catch (e) {
      toast.error(e.response?.data?.message || "Remove failed");
    }
  };

  const bill = async () => {
    if (!detail?.id) return;
    try {
      await apiClient.restaurantOrders.bill(detail.id, {
        paymentMethod: billMethod,
        allowIncompleteServe: billIncomplete,
      });
      toast.success("Billed — record payment to close");
      await refreshDetailAndList();
    } catch (e) {
      toast.error(e.response?.data?.message || "Billing failed");
    }
  };

  const recordPayment = async () => {
    if (!detail?.id) return;
    const problem = paymentProblem(payForm);
    if (problem) {
      toast.error(problem);
      return;
    }
    try {
      await apiClient.restaurantOrders.recordPayment(detail.id, paymentPayload(payForm));
      toast.success("Payment recorded");
      await refreshDetailAndList();
    } catch (e) {
      toast.error(e.response?.data?.message || "Payment failed");
    }
  };

  const voidOrder = async () => {
    if (!detail?.id) return;
    if (!confirm("Void this open order?")) return;
    try {
      await apiClient.restaurantOrders.void(detail.id);
      toast.success("Voided");
      setDetailId(null);
      await loadList();
    } catch (e) {
      toast.error(e.response?.data?.message || "Void failed");
    }
  };

  const porkOnly =
    isAdmin && branches.length > 0 ? true : user?.branch?.type === "PORK_BUTCHERY";

  if (!porkOnly && !isAdmin) {
    return (
      <PageShell>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm max-w-lg">
          <p className="text-gray-600">Table orders are only for pork butchery branches.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-2xl sm:max-w-3xl pb-28 space-y-4">
      <PageHeader
        className="pt-2"
        title="Table orders"
        subtitle="Kitchen tickets for this session — tap a card to add items, bill, or pay."
      >
        <Link
          href="/dashboard/restaurant-orders/new"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 text-white px-4 py-3 text-sm font-semibold shadow-sm hover:bg-emerald-700 min-h-[48px] shrink-0"
        >
          + New order
        </Link>
      </PageHeader>

      {isAdmin && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-700">Branch</label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm min-h-[44px]"
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
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm">
          Open a stock session on{" "}
          <Link href="/dashboard/stock" className="font-medium underline">
            Stock Session
          </Link>{" "}
          first.
        </div>
      )}

      {session?.id && (
        <>
          <div className="mt-4 flex rounded-xl bg-slate-100/80 p-1 gap-1">
            {["active", "closed"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setListTab(t)}
                className={`flex-1 rounded-lg py-3 text-sm font-semibold min-h-[48px] transition-colors ${
                  listTab === t ? "bg-white shadow text-slate-900" : "text-slate-600"
                }`}
              >
                {t === "active" ? "Active" : "Closed"}
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-500 mt-2">Session #{session.id}</p>

          {loading && <p className="text-slate-500 mt-4">Loading…</p>}

          {!loading && orders.length === 0 && (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm border border-slate-200 text-slate-500" aria-hidden>
                <ClipboardDocumentListIcon className="h-8 w-8" />
              </div>
              <p className="mt-4 text-base font-semibold text-slate-900">
                No {listTab === "active" ? "open" : "closed"} table orders yet
              </p>
              <ul className="mt-3 text-sm text-slate-600 text-left max-w-sm mx-auto space-y-2 list-disc pl-5">
                <li>Start a table order — the kitchen sees it on the Kitchen screen.</li>
                <li>Use Table / label (e.g. 3) so wait staff can find the ticket.</li>
              </ul>
              <Link
                href="/dashboard/restaurant-orders/new"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-600 text-white px-5 py-3 text-sm font-semibold shadow-sm hover:bg-emerald-700 min-h-[48px]"
              >
                + New table order
              </Link>
              <p className="mt-4 text-xs text-slate-500">
                <Link href="/dashboard/kitchen" className="text-emerald-800 font-medium underline">
                  Open Kitchen view
                </Link>
              </p>
            </div>
          )}

          <ul className="mt-4 space-y-3">
            {orders.map((o) => {
              const badge = orderStatusBadge(o.status);
              const { count, total } = orderLineSummary(o);
              return (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => setDetailId(o.id)}
                  className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-200 hover:shadow-md active:scale-[0.99] transition-all min-h-[88px]"
                >
                  <div className="flex justify-between gap-2 items-start">
                    <div>
                      <span className="font-semibold text-slate-900 text-lg">{o.orderNumber}</span>
                      <p className="text-xs text-slate-500 mt-0.5">{badge.sub}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${badge.pill}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    <span>{o.serviceType === "DINE_IN" ? "Dine-in" : "Takeaway"}</span>
                    {o.tableLabel ? <span>Table {o.tableLabel}</span> : null}
                    {o.assignedStaff?.username ? <span>{o.assignedStaff.username}</span> : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{count} line{count !== 1 ? "s" : ""}</span>
                    {count > 0 ? (
                      <span>Est. {fmtKes(total)}</span>
                    ) : null}
                  </div>
                </button>
              </li>
            );
            })}
          </ul>
        </>
      )}

      {/* Detail sheet */}
      {detailId && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/40">
          <div
            className="absolute inset-0"
            aria-hidden
            onClick={() => setDetailId(null)}
          />
          <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl border border-gray-200 bg-white shadow-xl sm:max-h-[88vh] sm:rounded-2xl">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-gray-900">{detail?.orderNumber || "Order"}</h2>
                <p className="text-xs text-gray-500">Table, dishes, billing — scroll sections below.</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailId(null)}
                className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 min-h-[44px]"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {detailLoading && <p className="text-center text-sm text-gray-500">Loading…</p>}

              {!detailLoading && detail?.status === "OPEN" && (
                <div className="space-y-4 pb-2">
                  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Table & notes</h3>
                        <p className="text-xs text-gray-500">Who is serving and table label — save when you change them.</p>
                      </div>
                      <button
                        type="button"
                        onClick={saveMeta}
                        className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-md bg-blue-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#1e88b5] sm:text-sm"
                      >
                        Save
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-1">
                        <label className="mb-1 block text-xs font-medium text-gray-600">Table / label</label>
                        <input
                          value={metaTable}
                          onChange={(e) => setMetaTable(e.target.value)}
                          className={orderModalField}
                          placeholder="e.g. 4, Counter"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="mb-1 block text-xs font-medium text-gray-600">Staff</label>
                        <select
                          value={metaStaff}
                          onChange={(e) => setMetaStaff(e.target.value)}
                          className={orderModalField}
                        >
                          <option value="">— None —</option>
                          {staffOptions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.username}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-gray-600">Order notes</label>
                        <textarea
                          value={metaNotes}
                          onChange={(e) => setMetaNotes(e.target.value)}
                          rows={2}
                          className={`${orderModalField} min-h-[80px] resize-y py-2`}
                          placeholder="Optional — visible to kitchen"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">Dishes on this ticket</h3>
                      <span className="text-xs text-gray-500">{(detail.lines || []).length} line(s)</span>
                    </div>
                    <ul className="space-y-3">
                      {(detail.lines || []).map((line) => {
                        const queued = line.status === "QUEUED";
                        return (
                          <li
                            key={line.id}
                            className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="font-medium text-gray-900">{line.product?.name}</p>
                              <span
                                className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${lineStatusPillClass(line.status, line)}`}
                              >
                                {lineStatusLabel(line.status, line)}
                              </span>
                            </div>
                            {queued ? (
                              <div className="mt-3 space-y-3">
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-12 sm:items-end">
                                  <div className="col-span-1 sm:col-span-3">
                                    <label className="mb-1 block text-xs font-medium text-gray-600">Qty</label>
                                    <input
                                      type="number"
                                      min="0.01"
                                      step="any"
                                      defaultValue={line.quantity}
                                      id={`line-qty-${line.id}`}
                                      className={orderModalField}
                                    />
                                  </div>
                                  <div className="col-span-1 sm:col-span-4">
                                    <label className="mb-1 block text-xs font-medium text-gray-600">Unit (KES)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      defaultValue={line.unitPrice}
                                      id={`line-price-${line.id}`}
                                      className={orderModalField}
                                    />
                                  </div>
                                  <div className="col-span-2 sm:col-span-5">
                                    <label className="mb-1 block text-xs font-medium text-gray-600">Line notes</label>
                                    <input
                                      defaultValue={line.notes || ""}
                                      id={`line-notes-${line.id}`}
                                      className={orderModalField}
                                      placeholder="Optional"
                                    />
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                                  <button
                                    type="button"
                                    onClick={() => updateQueuedLine(line)}
                                    className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                                  >
                                    Update line
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeLine(line.id)}
                                    className="min-h-[40px] px-2 text-sm font-medium text-red-600 hover:underline"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="mt-2 text-sm text-gray-600">
                                × <span className="font-medium tabular-nums">{line.quantity}</span> @{" "}
                                {fmtKes(line.unitPrice)}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <details className="group rounded-xl border border-gray-200 bg-white shadow-sm">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-gray-900 marker:hidden [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center justify-between gap-2">
                        <span>Add another dish</span>
                        <span className="text-xs font-normal text-gray-500 group-open:hidden">Expand</span>
                        <span className="hidden text-xs font-normal text-gray-500 group-open:inline">Collapse</span>
                      </span>
                    </summary>
                    <div className="space-y-3 border-t border-gray-100 px-4 pb-4 pt-2">
                      <ProductPicker
                        products={products}
                        value={addProductId}
                        onChange={setAddProductId}
                        idPrefix="add-line"
                      />
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={addQty}
                          onChange={(e) => setAddQty(e.target.value)}
                          className={`${orderModalField} w-24 shrink-0`}
                        />
                        <input
                          value={addNotes}
                          onChange={(e) => setAddNotes(e.target.value)}
                          placeholder="Line notes"
                          className={`${orderModalField} min-w-0 flex-1`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addLines}
                        disabled={!addProductId}
                        className="w-full rounded-md border-2 border-emerald-600 bg-emerald-50 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-40 min-h-[44px]"
                      >
                        Add to order
                      </button>
                    </div>
                  </details>

                  <details className="group rounded-xl border border-gray-900 bg-gray-900 text-white shadow-sm">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center justify-between gap-2">
                        <span>Bill customer (creates sale)</span>
                        <span className="text-xs font-normal text-white/70 group-open:hidden">Expand</span>
                        <span className="hidden text-xs font-normal text-white/70 group-open:inline">Collapse</span>
                      </span>
                    </summary>
                    <div className="space-y-3 border-t border-white/10 px-4 pb-4 pt-3">
                      <select
                        value={billMethod}
                        onChange={(e) => setBillMethod(e.target.value)}
                        className="w-full min-h-[44px] rounded-md border-0 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm"
                      >
                        <option value="CASH">Cash</option>
                        <option value="MPESA">M-Pesa</option>
                        <option value="PDQ">Card (PDQ)</option>
                        <option value="CREDIT">Credit</option>
                      </select>
                      <label className="flex items-start gap-2 text-sm text-white/90">
                        <input
                          type="checkbox"
                          checked={billIncomplete}
                          onChange={(e) => setBillIncomplete(e.target.checked)}
                          className="mt-1 h-4 w-4 shrink-0 rounded border-white/40"
                        />
                        <span>Bill before all lines served (rush / pay first)</span>
                      </label>
                      <button
                        type="button"
                        onClick={bill}
                        className="w-full rounded-md bg-white py-2.5 text-sm font-bold text-gray-900 min-h-[44px] hover:bg-gray-100"
                      >
                        Create bill
                      </button>
                    </div>
                  </details>
                </div>
              )}

              {!detailLoading && detail?.status === "BILLED" && detail.linkedSale && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Sale</p>
                    <p className="text-xl font-bold text-gray-900">{detail.linkedSale.saleNumber}</p>
                    <p className="mt-1 text-gray-700">Total {fmtKes(detail.linkedSale.totalAmount)}</p>
                    <p className="mt-2 text-sm text-gray-600">
                      Payment:{" "}
                      <span className="font-semibold text-gray-900">{detail.linkedSale.paymentStatus}</span>
                      {detail.linkedSale.paymentMethod ? ` · ${detail.linkedSale.paymentMethod}` : ""}
                    </p>
                  </div>

                  {detail.linkedSale.paymentStatus === "PENDING" && !detail.linkedSale.payment && (
                    <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="font-semibold text-emerald-900">Record payment</p>
                      <PaymentPicker value={payForm} onChange={setPayForm} settings={saleSettings} />
                      <button
                        type="button"
                        onClick={recordPayment}
                        className="w-full rounded-md bg-emerald-600 py-2.5 text-sm font-bold text-white min-h-[44px] hover:bg-emerald-700"
                      >
                        Confirm payment
                      </button>
                    </div>
                  )}

                  {detail.linkedSale.paymentStatus === "PAID" && (
                    <p className="py-2 text-center text-sm font-semibold text-emerald-700">Paid</p>
                  )}

                  <Link
                    href={`/dashboard/sales/${detail.linkedSale.id}`}
                    className="block rounded-md py-2 text-center text-sm font-medium text-blue-900 hover:text-[#1e88b5] hover:underline"
                  >
                    Open sale #{detail.linkedSale.id}
                  </Link>
                </div>
              )}

              {!detailLoading && detail?.status === "VOID" && (
                <p className="py-8 text-center text-sm text-gray-600">This order was voided.</p>
              )}
            </div>

            {!detailLoading && detail?.status === "OPEN" && (
              <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-3">
                <button
                  type="button"
                  onClick={voidOrder}
                  className="w-full rounded-md py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Void entire order…
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <Link
        href="/dashboard/restaurant-orders/new"
        className="fixed bottom-20 right-4 z-30 md:bottom-8 inline-flex items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg w-14 h-14 text-sm font-bold hover:bg-emerald-700 md:hidden"
        aria-label="New table order"
      >
        +
      </Link>
    </PageShell>
  );
}

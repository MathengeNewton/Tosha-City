"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../../../../contexts/AuthContext";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import ProductPicker from "../../../../components/restaurant/ProductPicker";

const fmtKes = (n) =>
  `${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} KES`;

function orderStatusBadge(status) {
  if (status === "OPEN") return { label: "Kitchen", sub: "Order open", pill: "bg-emerald-100 text-emerald-900" };
  if (status === "BILLED") return { label: "Billed", sub: "Check payment if needed", pill: "bg-blue-100 text-blue-900" };
  if (status === "VOID") return { label: "Voided", sub: "Cancelled", pill: "bg-slate-200 text-slate-700" };
  return { label: status, sub: "", pill: "bg-slate-200 text-slate-700" };
}

function lineStatusLabel(st) {
  const m = {
    QUEUED: "Waiting to cook",
    COOKING: "Cooking",
    READY: "Ready to serve",
    SERVED: "Served",
  };
  return m[st] || st;
}

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

  const [payMethod, setPayMethod] = useState("CASH");
  const [payMpesa, setPayMpesa] = useState("");

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
    apiClient.products.getActive().then((res) => setProducts(res.data || [])).catch(() => {});
  }, []);

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
    try {
      await apiClient.restaurantOrders.recordPayment(detail.id, {
        method: payMethod,
        mpesaReference: payMethod === "MPESA" ? payMpesa : undefined,
      });
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
      <div className="p-6">
        <p className="text-gray-600">Table orders are only for pork butchery branches.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl sm:max-w-3xl mx-auto w-full min-h-[70vh] pb-28 px-3 sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Table orders</h1>
          <p className="text-slate-600 text-sm mt-0.5">
            Kitchen tickets for this session — tap a card to add items, bill, or pay.
          </p>
        </div>
        <Link
          href="/dashboard/restaurant-orders/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-3 text-sm font-semibold shadow-sm hover:bg-emerald-700 min-h-[48px] shrink-0"
        >
          + New order
        </Link>
      </div>

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
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-xl border border-slate-200">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-white px-4 py-3">
              <h2 className="text-lg font-bold text-slate-900 truncate">
                {detail?.orderNumber || "Order"}
              </h2>
              <button
                type="button"
                onClick={() => setDetailId(null)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 min-h-[44px]"
              >
                Close
              </button>
            </div>

            <div className="p-4 space-y-6 pb-10">
              {detailLoading && <p className="text-slate-500">Loading…</p>}

              {!detailLoading && detail?.status === "OPEN" && (
                <>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Table & staff</p>
                    <label className="block text-sm text-slate-700">Table / label</label>
                    <input
                      value={metaTable}
                      onChange={(e) => setMetaTable(e.target.value)}
                      className="w-full border rounded-xl px-3 py-3 text-base min-h-[48px]"
                      placeholder="e.g. 4"
                    />
                    <label className="block text-sm text-slate-700">Notes</label>
                    <textarea
                      value={metaNotes}
                      onChange={(e) => setMetaNotes(e.target.value)}
                      rows={2}
                      className="w-full border rounded-xl px-3 py-2 text-base"
                      placeholder="Optional"
                    />
                    <label className="block text-sm text-slate-700">Staff</label>
                    <select
                      value={metaStaff}
                      onChange={(e) => setMetaStaff(e.target.value)}
                      className="w-full border rounded-xl px-3 py-3 text-base min-h-[48px]"
                    >
                      <option value="">— None —</option>
                      {staffOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.username}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={saveMeta}
                      className="w-full rounded-xl bg-slate-900 text-white py-3 text-sm font-semibold min-h-[48px] hover:bg-slate-800"
                    >
                      Save details
                    </button>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Lines</p>
                    <ul className="space-y-3">
                      {(detail.lines || []).map((line) => {
                        const queued = line.status === "QUEUED";
                        return (
                          <li key={line.id} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                            <div className="font-medium text-slate-900">{line.product?.name}</div>
                            <div className="text-xs text-slate-600 mt-0.5 font-medium">{lineStatusLabel(line.status)}</div>
                            {queued ? (
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-slate-600">Qty</label>
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="any"
                                    defaultValue={line.quantity}
                                    id={`line-qty-${line.id}`}
                                    className="w-full border rounded-lg px-2 py-2 text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-slate-600">Unit (KES)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    defaultValue={line.unitPrice}
                                    id={`line-price-${line.id}`}
                                    className="w-full border rounded-lg px-2 py-2 text-sm"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-xs text-slate-600">Notes</label>
                                  <input
                                    defaultValue={line.notes || ""}
                                    id={`line-notes-${line.id}`}
                                    className="w-full border rounded-lg px-2 py-2 text-sm"
                                  />
                                </div>
                                <div className="col-span-2 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => updateQueuedLine(line)}
                                    className="flex-1 rounded-lg bg-white border py-2 text-sm font-medium min-h-[44px]"
                                  >
                                    Update line
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeLine(line.id)}
                                    className="rounded-lg px-3 text-sm text-red-600 min-h-[44px]"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-slate-700 mt-1">
                                × {line.quantity} @ {fmtKes(line.unitPrice)}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-dashed border-slate-200 p-3 space-y-3 bg-slate-50/30">
                    <p className="text-sm font-medium text-slate-800">Add item</p>
                    <ProductPicker
                      products={products}
                      value={addProductId}
                      onChange={setAddProductId}
                      idPrefix="add-line"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={addQty}
                        onChange={(e) => setAddQty(e.target.value)}
                        className="w-24 border rounded-xl px-2 py-3 text-base"
                      />
                      <input
                        value={addNotes}
                        onChange={(e) => setAddNotes(e.target.value)}
                        placeholder="Line notes"
                        className="flex-1 border rounded-xl px-3 py-3 text-base"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addLines}
                      disabled={!addProductId}
                      className="w-full rounded-xl border-2 border-emerald-600 text-emerald-700 py-3 font-semibold min-h-[48px] disabled:opacity-40"
                    >
                      Add to order
                    </button>
                  </div>

                  <div className="rounded-xl bg-slate-900 text-white p-4 space-y-3">
                    <p className="text-sm font-semibold">Bill (creates sale)</p>
                    <select
                      value={billMethod}
                      onChange={(e) => setBillMethod(e.target.value)}
                      className="w-full rounded-lg px-3 py-3 text-slate-900 min-h-[48px]"
                    >
                      <option value="CASH">Cash</option>
                      <option value="MPESA">M-Pesa</option>
                      <option value="CREDIT">Credit</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={billIncomplete}
                        onChange={(e) => setBillIncomplete(e.target.checked)}
                        className="h-5 w-5"
                      />
                      Bill before all lines served (rush / pay first)
                    </label>
                    <button
                      type="button"
                      onClick={bill}
                      className="w-full rounded-xl bg-white text-slate-900 py-3 font-bold min-h-[48px]"
                    >
                      Create bill
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={voidOrder}
                    className="w-full text-red-600 py-2 text-sm font-medium"
                  >
                    Void order
                  </button>
                </>
              )}

              {!detailLoading && detail?.status === "BILLED" && detail.linkedSale && (
                <div className="space-y-4">
                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-slate-600">Sale</p>
                    <p className="text-xl font-bold text-slate-900">{detail.linkedSale.saleNumber}</p>
                    <p className="text-slate-700 mt-1">Total {fmtKes(detail.linkedSale.totalAmount)}</p>
                    <p className="text-sm mt-2">
                      Payment:{" "}
                      <span className="font-semibold">{detail.linkedSale.paymentStatus}</span>
                      {detail.linkedSale.paymentMethod ? ` · ${detail.linkedSale.paymentMethod}` : ""}
                    </p>
                  </div>

                  {detail.linkedSale.paymentStatus === "PENDING" && !detail.linkedSale.payment && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-3">
                      <p className="font-semibold text-emerald-900">Record payment</p>
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value)}
                        className="w-full border rounded-xl px-3 py-3 min-h-[48px]"
                      >
                        <option value="CASH">Cash</option>
                        <option value="MPESA">M-Pesa</option>
                      </select>
                      {payMethod === "MPESA" && (
                        <input
                          value={payMpesa}
                          onChange={(e) => setPayMpesa(e.target.value)}
                          placeholder="M-Pesa ref"
                          className="w-full border rounded-xl px-3 py-3 min-h-[48px]"
                        />
                      )}
                      <button
                        type="button"
                        onClick={recordPayment}
                        className="w-full rounded-xl bg-emerald-600 text-white py-3 font-bold min-h-[48px] hover:bg-emerald-700"
                      >
                        Confirm payment
                      </button>
                    </div>
                  )}

                  {detail.linkedSale.paymentStatus === "PAID" && (
                    <p className="text-center text-emerald-700 font-semibold py-2">Paid</p>
                  )}

                  <Link
                    href={`/dashboard/sales/${detail.linkedSale.id}`}
                    className="block text-center text-blue-700 underline py-2"
                  >
                    Open sale #{detail.linkedSale.id}
                  </Link>
                </div>
              )}

              {!detailLoading && detail?.status === "VOID" && (
                <p className="text-slate-600 text-center py-6">This order was voided.</p>
              )}
            </div>
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
    </div>
  );
}

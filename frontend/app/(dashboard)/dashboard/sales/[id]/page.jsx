"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "../../../../../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../../../../../contexts/AuthContext";
import { buildCustomerBillDocument } from "../customerBill";
import { PageShell, PageHeader, PageLoading } from "../../../components/shell";
import ProductGrid from "../ProductGrid";
import SaleLineCard from "../SaleLineCard";
import PaymentPicker, { emptyPayment, paymentLabel, paymentPayload, paymentProblem } from "../PaymentPicker";
import {
  buildLine,
  changeLine,
  cookingFeeFor,
  formatKes,
  isSmallCook,
  lineToPayload,
  linesTotal,
  roundUpKes,
  validateLines,
} from "../saleLines";

export default function SaleDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const saleId = params.id;
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [loading, setLoading] = useState(true);
  const [sale, setSale] = useState(null);
  const [payment, setPayment] = useState(null);
  const [settings, setSettings] = useState(null);
  const [adding, setAdding] = useState(false);
  const [tillProducts, setTillProducts] = useState([]);
  const [newLines, setNewLines] = useState([]);
  const [savingItems, setSavingItems] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState(emptyPayment("CASH"));
  const [submitting, setSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPaymentMethod, setEditPaymentMethod] = useState("CASH");
  const [editPayment, setEditPayment] = useState(emptyPayment("CASH"));
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editingItems, setEditingItems] = useState(false);
  const [itemDrafts, setItemDrafts] = useState([]);
  const [savingItemEdits, setSavingItemEdits] = useState(false);

  const isPaid = sale?.paymentStatus === "PAID";
  const canAdminEditSale = !!sale && isAdmin;
  const canAddItems =
    !!sale &&
    sale.paymentStatus === "PENDING" &&
    (sale.session?.status === "OPEN" || isAdmin) &&
    !sale.restaurantOrderId;
  const cookingFeePerKg = Number(settings?.cookingFeePerKg ?? 100);

  useEffect(() => {
    if (saleId) {
      loadSaleData();
    }
  }, [saleId]);

  useEffect(() => {
    apiClient.saleSettings
      .get()
      .then((res) => setSettings(res.data))
      .catch(() => setSettings(null));
  }, []);

  const startAdding = async () => {
    try {
      const res = await apiClient.sales.getTillAvailability({ sessionId: sale.sessionId });
      const list = Array.isArray(res.data) ? res.data : [];
      setTillProducts(list.filter((product) => Number(product.available) > 0));
      setNewLines([]);
      setAdding(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load products");
    }
  };

  const updateNewLine = (index, field, value) => {
    setNewLines((prev) =>
      prev.map((line, i) => (i === index ? changeLine(line, field, value, tillProducts, sale.customer) : line)),
    );
  };

  const handleSaveNewItems = async () => {
    const problem = validateLines(newLines);
    if (problem) {
      toast.error(problem);
      return;
    }
    try {
      setSavingItems(true);
      await apiClient.sales.addItems(sale.id, {
        items: newLines.map((line) =>
          lineToPayload(
            line,
            tillProducts.find((p) => p.id === parseInt(line.productId, 10)),
          ),
        ),
      });
      toast.success("Items added to the sale");
      setAdding(false);
      setNewLines([]);
      loadSaleData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add items");
    } finally {
      setSavingItems(false);
    }
  };

  const startEditingItems = () => {
    setAdding(false);
    setNewLines([]);
    setItemDrafts(
      (sale.items || []).map((item) => ({
        id: item.id,
        name: item.product?.name || "Item",
        unit: item.product?.unit || "",
        quantity: String(Number(item.quantity || 0)),
        unitPrice: String(Number(item.unitPrice || 0)),
        cookInKitchen: !!item.cookInKitchen,
        cookingFeePerKg: item.cookingFeePerKg ?? cookingFeePerKg,
      })),
    );
    setEditingItems(true);
  };

  const updateDraft = (id, field, value) => {
    setItemDrafts((prev) => prev.map((draft) => (draft.id === id ? { ...draft, [field]: value } : draft)));
  };

  const draftLineTotal = (draft) => roundUpKes(parseFloat(draft.quantity || 0) * parseFloat(draft.unitPrice || 0));
  const draftCookingFee = (draft) =>
    draft.cookInKitchen ? cookingFeeFor(parseFloat(draft.quantity || 0), draft.cookingFeePerKg) : 0;
  const draftsTotal = itemDrafts.reduce((sum, draft) => sum + draftLineTotal(draft) + draftCookingFee(draft), 0);

  const handleSaveItemEdits = async () => {
    if (itemDrafts.length === 0) {
      toast.error("A sale needs at least one item. Use Delete Sale instead.");
      return;
    }
    for (const draft of itemDrafts) {
      if (!(parseFloat(draft.quantity) > 0)) {
        toast.error(`Quantity for ${draft.name} must be greater than 0`);
        return;
      }
      if (draft.unitPrice === "" || !(parseFloat(draft.unitPrice) >= 0)) {
        toast.error(`Enter a price for ${draft.name}`);
        return;
      }
    }
    if (
      isPaid &&
      !confirm(
        `This sale is paid. Its payment amount will change from KES ${formatKes(sale.totalAmount)} to KES ${formatKes(draftsTotal)}. Continue?`,
      )
    ) {
      return;
    }
    try {
      setSavingItemEdits(true);
      await apiClient.sales.editItems(sale.id, {
        items: itemDrafts.map((draft) => ({
          id: draft.id,
          quantity: parseFloat(draft.quantity),
          unitPrice: parseFloat(draft.unitPrice),
        })),
      });
      toast.success("Sale items updated");
      setEditingItems(false);
      loadSaleData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update items");
    } finally {
      setSavingItemEdits(false);
    }
  };

  const loadSaleData = async () => {
    try {
      setLoading(true);
      
      const saleRes = await apiClient.sales.getById(saleId);
      setSale(saleRes.data);

      // Try to get payment
      try {
        const paymentRes = await apiClient.payments.getBySaleId(saleId);
        setPayment(paymentRes.data);
      } catch (error) {
        // Payment might not exist yet
        setPayment(null);
      }

    } catch (error) {
      console.error("Error loading sale:", error);
      toast.error("Failed to load sale details");
    } finally {
      setLoading(false);
    }
  };

  const openRecordPaymentModal = () => {
    setPaymentForm(emptyPayment(sale?.paymentMethod));
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
  };

  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!sale) return;
    const problem = paymentProblem(paymentForm);
    if (problem) {
      toast.error(problem);
      return;
    }
    try {
      setSubmitting(true);
      await apiClient.payments.create({
        saleId: sale.id,
        amount: Number(sale.totalAmount),
        ...paymentPayload(paymentForm),
      });
      toast.success("Payment recorded successfully");
      closePaymentModal();
      loadSaleData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = () => {
    setEditPaymentMethod(sale.paymentMethod || "CASH");
    const recorded = emptyPayment(payment?.method);
    setEditPayment({
      ...recorded,
      mpesaChannel: recorded.method === "MPESA" ? payment?.mpesaChannel || "TILL" : "",
      reference: payment?.reference || "",
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    let body = { paymentMethod: editPaymentMethod };
    if (isPaid) {
      const problem = paymentProblem(editPayment);
      if (problem) {
        toast.error(problem);
        return;
      }
      const { method, mpesaChannel, reference } = paymentPayload(editPayment);
      body = { paymentMethod: method, mpesaChannel, reference };
    }
    try {
      setSubmittingEdit(true);
      await apiClient.sales.update(sale.id, body);
      toast.success("Sale updated");
      setShowEditModal(false);
      loadSaleData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update sale");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteSale = async () => {
    const message = isPaid
      ? `Delete paid sale ${sale.saleNumber}? Its payment record is removed too and its items go back into stock. This cannot be undone.`
      : `Delete sale ${sale.saleNumber}? Its items go back into stock.`;
    if (!confirm(message)) return;
    try {
      await apiClient.sales.delete(sale.id);
      toast.success("Sale deleted");
      router.push("/dashboard/sales");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete sale");
    }
  };

  const handlePrintReceipt = (kind) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:fixed;left:-10000px;top:0;width:420px;height:800px;border:0;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      toast.error("Could not open the print slip");
      return;
    }
    doc.open();
    doc.write(buildCustomerBillDocument(sale, kind, settings || {}));
    doc.close();
  };

  if (loading) {
    return (
      <PageShell>
        <PageLoading message="Loading sale details…" />
      </PageShell>
    );
  }

  if (!sale) {
    return (
      <PageShell>
        <p className="text-gray-600">Sale not found</p>
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-4 sm:space-y-8">
      {/* Header and actions - hidden when printing */}
      <PageHeader className="no-print" title="Sale Details" subtitle={`Sale #${sale.saleNumber}`}>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {sale.paymentStatus === "PENDING" && (
            <button
              onClick={openRecordPaymentModal}
              className="flex-1 sm:flex-none bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm min-h-[44px]"
            >
              Record Payment
            </button>
          )}
          {canAddItems && !adding && !editingItems && (
            <button
              onClick={startAdding}
              className="flex-1 sm:flex-none bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-blue-800 transition-colors text-sm min-h-[44px]"
            >
              Add items
            </button>
          )}
          {canAdminEditSale && !editingItems && (
            <button
              onClick={startEditingItems}
              className="flex-1 sm:flex-none bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors text-sm min-h-[44px]"
            >
              Edit items
            </button>
          )}
          {canAdminEditSale && (
            <button
              onClick={handleOpenEditModal}
              className="flex-1 sm:flex-none bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors text-sm min-h-[44px]"
            >
              Edit Sale
            </button>
          )}
          {canAdminEditSale && (
            <button
              onClick={handleDeleteSale}
              className="flex-1 sm:flex-none bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm min-h-[44px]"
            >
              Delete Sale
            </button>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
            KES {formatKes(sale.totalAmount)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payment</p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {payment ? paymentLabel(payment.method, payment.mpesaChannel) : paymentLabel(sale.paymentMethod)}
          </p>
          <p className={`mt-1 text-sm font-semibold ${sale.paymentStatus === "PAID" ? "text-green-700" : "text-amber-700"}`}>
            {sale.paymentStatus === "PAID" ? "Paid" : "Unpaid"}
          </p>
          {payment?.reference && <p className="mt-1 text-sm text-gray-600">Ref {payment.reference}</p>}
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">When</p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {sale.soldAt ? new Date(sale.soldAt).toLocaleString() : "—"}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {sale.customer?.name || "Walk-in"}
            {sale.soldBy?.username ? ` · ${sale.soldBy.username}` : ""}
          </p>
          {(sale.tableLabel || sale.restaurantOrder?.tableLabel) && (
            <p className="mt-1 text-base font-bold text-gray-900">
              Table {sale.tableLabel || sale.restaurantOrder?.tableLabel}
            </p>
          )}
        </div>
      </div>

      {isPaid && !isAdmin && (
        <p className="no-print rounded-xl bg-gray-100 px-4 py-2 text-sm text-gray-700">
          This sale is paid and can no longer be edited.
        </p>
      )}

      {editingItems && (
        <div className="no-print space-y-3 rounded-2xl border-2 border-gray-700/30 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div>
              <p className="text-lg font-bold text-gray-900">Edit items</p>
              <p className="text-sm text-gray-600">
                Change quantity or price, or remove an item. Stock{isPaid ? " and the payment amount" : ""} update to match.
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">New total</p>
              <p className="text-lg font-bold tabular-nums text-gray-900">KES {formatKes(draftsTotal)}</p>
            </div>
          </div>
          {itemDrafts.map((draft) => (
            <div key={draft.id} className="rounded-xl border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-base font-bold text-gray-900">{draft.name}</p>
                <button
                  type="button"
                  onClick={() => setItemDrafts((prev) => prev.filter((d) => d.id !== draft.id))}
                  className="rounded-md px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Quantity{draft.unit ? ` (${draft.unit})` : ""}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={draft.quantity}
                    onChange={(e) => updateDraft(draft.id, "quantity", e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-base min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Unit price (KES)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={draft.unitPrice}
                    onChange={(e) => updateDraft(draft.id, "unitPrice", e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-base min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <div className="col-span-2 sm:col-span-1 sm:text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Line total</p>
                  <p className="mt-2 text-lg font-bold tabular-nums text-gray-900">{formatKes(draftLineTotal(draft))}</p>
                  {draft.cookInKitchen && (
                    <p className="text-sm text-orange-800">+ {formatKes(draftCookingFee(draft))} cooking</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {itemDrafts.length === 0 && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Every item is removed. A sale needs at least one item; use Delete Sale to remove the whole sale.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveItemEdits}
              disabled={savingItemEdits || itemDrafts.length === 0}
              className="min-h-[52px] flex-1 rounded-xl bg-green-600 px-6 text-base font-bold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {savingItemEdits ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => setEditingItems(false)}
              className="min-h-[52px] rounded-xl bg-gray-200 px-6 text-base font-semibold text-gray-800 hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className={`space-y-3 ${editingItems ? "hidden print:block" : ""}`}>
        {(sale.items || []).map((item) => {
          const qty = parseFloat(item.quantity || 0);
          const unitPrice = parseFloat(item.unitPrice || 0);
          const lineTotal = parseFloat(item.totalPrice || qty * unitPrice || 0);
          const cookingFee = parseFloat(item.cookingFee || 0);
          return (
            <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-gray-900">{item.product?.name || "Item"}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {qty.toLocaleString("en-KE", { maximumFractionDigits: 3 })} {item.product?.unit || ""} × KES{" "}
                    {formatKes(unitPrice)}
                  </p>
                </div>
                <p className="text-lg font-bold tabular-nums text-gray-900">
                  {formatKes(lineTotal)}
                </p>
              </div>
              {item.cookInKitchen && cookingFee > 0 && (
                <div className="mt-2 flex items-start justify-between gap-3 rounded-lg bg-orange-50 px-3 py-2 text-orange-900">
                  <p className="text-sm font-semibold">
                    Kitchen cooking fee · {qty.toLocaleString("en-KE", { maximumFractionDigits: 3 })} kg
                    {isSmallCook(unitPrice > 0 && lineTotal > 0 ? lineTotal / unitPrice : qty)
                      ? " (under ½ kg)"
                      : ` × KES ${formatKes(item.cookingFeePerKg)}`}
                  </p>
                  <p className="text-base font-bold tabular-nums">{formatKes(cookingFee)}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {adding && (
        <div className="no-print space-y-3 rounded-2xl border-2 border-blue-900/30 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div>
              <p className="text-lg font-bold text-gray-900">Add items</p>
              <p className="text-sm text-gray-600">
                Items already on the sale stay. New items are added to the total.
              </p>
            </div>
            {newLines.length > 0 && (
              <p className="text-lg font-bold tabular-nums text-gray-900">
                + KES {formatKes(linesTotal(newLines, tillProducts, cookingFeePerKg))}
              </p>
            )}
          </div>
          {newLines.map((line, index) => (
            <SaleLineCard
              key={`${index}-${line.productId}`}
              line={line}
              products={tillProducts}
              onChange={(field, value) => updateNewLine(index, field, value)}
              onRemove={() => setNewLines((prev) => prev.filter((_, i) => i !== index))}
              cookingFeePerKg={cookingFeePerKg}
              allowPriceEdit={isAdmin}
            />
          ))}
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <ProductGrid
              products={tillProducts}
              customer={sale.customer}
              onPick={(product) => setNewLines((prev) => [...prev, buildLine(product, sale.customer)])}
              className="max-h-[50vh]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveNewItems}
              disabled={savingItems || newLines.length === 0}
              className="min-h-[52px] flex-1 rounded-xl bg-green-600 px-6 text-base font-bold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {savingItems ? "Adding…" : "Add to sale"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setNewLines([]);
              }}
              className="min-h-[52px] rounded-xl bg-gray-200 px-6 text-base font-semibold text-gray-800 hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="no-print flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => handlePrintReceipt("customer")}
          className="min-h-[52px] rounded-xl bg-blue-900 px-6 text-base font-bold text-white hover:bg-[#1e88b5]"
        >
          Print customer receipt
        </button>
        <button
          type="button"
          onClick={() => handlePrintReceipt("kitchen")}
          className="min-h-[52px] rounded-xl bg-blue-900 px-6 text-base font-bold text-white hover:bg-[#1e88b5]"
        >
          Print kitchen receipt
        </button>
        <Link
          href="/dashboard/sales"
          className="inline-flex min-h-[52px] items-center rounded-xl bg-gray-200 px-6 text-base font-semibold text-gray-800 hover:bg-gray-300"
        >
          Back to sales
        </Link>
      </div>

      {/* Edit Sale Modal (admin) */}
      {showEditModal && sale && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Edit Sale {sale.saleNumber}</h2>
            <p className="text-sm text-gray-600 mb-4">
              {isPaid
                ? "Correct how this sale was paid. The payment record is updated too."
                : "Change payment method."}
            </p>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              {isPaid ? (
                <PaymentPicker value={editPayment} onChange={setEditPayment} settings={settings} />
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
                    required
                  >
                    <option value="CASH">Cash</option>
                    <option value="MPESA">M-Pesa</option>
                    <option value="PDQ">Card (PDQ)</option>
                    <option value="CREDIT">Credit</option>
                  </select>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-3 rounded-md hover:bg-gray-300 min-h-[44px] text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex-1 bg-blue-900 text-white px-4 py-3 rounded-md hover:bg-blue-800 disabled:opacity-50 min-h-[44px] text-base"
                >
                  {submittingEdit ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && sale && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Record Payment</h2>
            <p className="text-sm text-gray-600 mb-4">
              Amount: KES{" "}
              {formatKes(sale.totalAmount)}
            </p>
            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              <PaymentPicker value={paymentForm} onChange={setPaymentForm} settings={settings} />
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-3 rounded-md hover:bg-gray-300 min-h-[44px] text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 disabled:opacity-50 min-h-[44px] text-base"
                >
                  {submitting ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}


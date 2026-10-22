"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "../../../../../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../../../../../contexts/AuthContext";
import { buildCustomerBillDocument } from "../customerBill";
import { PageShell, PageHeader, PageLoading } from "../../../components/shell";

export default function SaleDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const saleId = params.id;
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [loading, setLoading] = useState(true);
  const [sale, setSale] = useState(null);
  const [payment, setPayment] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [mpesaReference, setMpesaReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPaymentMethod, setEditPaymentMethod] = useState("CASH");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const canAdminEditSale =
    !!sale &&
    isAdmin &&
    sale.paymentStatus === "PENDING" &&
    sale.session?.status === "OPEN";

  useEffect(() => {
    if (saleId) {
      loadSaleData();
    }
  }, [saleId]);

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
    setPaymentMethod("CASH");
    setMpesaReference("");
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentMethod("CASH");
    setMpesaReference("");
  };

  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!sale) return;
    if (paymentMethod === "MPESA" && !mpesaReference.trim()) {
      toast.error("MPESA reference is required");
      return;
    }
    try {
      setSubmitting(true);
      await apiClient.payments.create({
        saleId: sale.id,
        amount: sale.totalAmount,
        method: paymentMethod,
        mpesaReference: paymentMethod === "MPESA" ? mpesaReference.trim() : undefined,
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
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingEdit(true);
      await apiClient.sales.update(sale.id, { paymentMethod: editPaymentMethod });
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
    if (!confirm(`Delete sale ${sale.saleNumber}? Only unpaid sales can be deleted.`)) return;
    try {
      await apiClient.sales.delete(sale.id);
      toast.success("Sale deleted");
      router.push("/dashboard/sales");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete sale");
    }
  };

  const handlePrintReceipt = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print the bill");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildCustomerBillDocument(sale));
    printWindow.document.close();
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
            KES {parseFloat(sale.totalAmount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payment</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{sale.paymentMethod || "—"}</p>
          <p className={`mt-1 text-sm font-semibold ${sale.paymentStatus === "PAID" ? "text-green-700" : "text-amber-700"}`}>
            {sale.paymentStatus === "PAID" ? "Paid" : "Unpaid"}
          </p>
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
        </div>
      </div>

      <div className="space-y-3">
        {(sale.items || []).map((item) => {
          const qty = parseFloat(item.quantity || 0);
          const unitPrice = parseFloat(item.unitPrice || 0);
          const lineTotal = parseFloat(item.totalPrice || qty * unitPrice || 0);
          return (
            <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-gray-900">{item.product?.name || "Item"}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {qty.toLocaleString("en-KE", { maximumFractionDigits: 3 })} {item.product?.unit || ""} × KES{" "}
                    {unitPrice.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <p className="text-lg font-bold tabular-nums text-gray-900">
                  {lineTotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {payment?.mpesaReference ? (
        <p className="text-sm text-gray-600">M-Pesa ref {payment.mpesaReference}</p>
      ) : null}

      <div className="no-print flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handlePrintReceipt}
          className="min-h-[52px] rounded-xl bg-blue-900 px-6 text-base font-bold text-white hover:bg-[#1e88b5]"
        >
          Print receipt
        </button>
        <Link
          href="/dashboard/sales"
          className="inline-flex min-h-[52px] items-center rounded-xl bg-gray-200 px-6 text-base font-semibold text-gray-800 hover:bg-gray-300"
        >
          Back to sales
        </Link>
      </div>

      {/* Edit Sale Modal (admin, unpaid only) */}
      {showEditModal && sale && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Edit Sale {sale.saleNumber}</h2>
            <p className="text-sm text-gray-600 mb-4">Change payment method (unpaid sales only).</p>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
                  required
                >
                  <option value="CASH">Cash</option>
                  <option value="MPESA">MPESA</option>
                  <option value="CREDIT">Credit</option>
                </select>
              </div>
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
              {parseFloat(sale.totalAmount || 0).toLocaleString("en-KE", {
                minimumFractionDigits: 2,
              })}
            </p>
            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    if (e.target.value === "CASH") setMpesaReference("");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
                  required
                >
                  <option value="CASH">Cash</option>
                  <option value="MPESA">MPESA</option>
                </select>
              </div>
              {paymentMethod === "MPESA" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MPESA Reference *
                  </label>
                  <input
                    type="text"
                    value={mpesaReference}
                    onChange={(e) => setMpesaReference(e.target.value)}
                    placeholder="e.g. ABC123XYZ"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
                    required={paymentMethod === "MPESA"}
                  />
                </div>
              )}
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


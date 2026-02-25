"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "../../../../../lib/api";
import { toast } from "react-toastify";
import ReceiptView from "../ReceiptView";
import { useAuth } from "../../../../../contexts/AuthContext";

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

  const handlePrintReceipt = async () => {
    try {
      // Fetch plain text receipt from backend
      const response = await apiClient.sales.getReceipt(saleId);
      const receiptText = response.data;

      // Create a new window with the plain text receipt
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to print receipt');
        return;
      }

      // Write plain text with monospace font for proper formatting
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt - ${sale.saleNumber}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 12pt;
              margin: 20px;
              white-space: pre;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>${receiptText.replace(/\n/g, '<br>')}</body>
        </html>
      `);
      printWindow.document.close();

      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          // Close window after printing (optional)
          // printWindow.close();
        }, 250);
      };
    } catch (error) {
      console.error('Error printing receipt:', error);
      toast.error(error.response?.data?.message || 'Failed to print receipt');
    }
  };

  if (loading) {
    return (
      <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading sale details...</div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen">
        <p className="text-gray-600">Sale not found</p>
      </div>
    );
  }

  return (
    <div className="w-full lg:p-2 space-y-4 sm:space-y-8 bg-gray-50 min-h-screen">
      {/* Header and actions - hidden when printing */}
      <div className="no-print mb-4 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Sale Details
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Sale #{sale.saleNumber}</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {sale.paymentStatus === "PAID" && (
            <button
              onClick={handlePrintReceipt}
              className="flex-1 sm:flex-none bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors text-sm min-h-[44px]"
            >
              Print Receipt
            </button>
          )}
          {sale.paymentStatus === "PENDING" && (
            <button
              onClick={openRecordPaymentModal}
              className="flex-1 sm:flex-none bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm min-h-[44px]"
            >
              Record Payment
            </button>
          )}
          {isAdmin && sale.paymentStatus === "PENDING" && (
            <button
              onClick={handleOpenEditModal}
              className="flex-1 sm:flex-none bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors text-sm min-h-[44px]"
            >
              Edit Sale
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleDeleteSale}
              className="flex-1 sm:flex-none bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm min-h-[44px]"
            >
              Delete Sale
            </button>
          )}
        </div>
      </div>

      {/* Products in this sale – pill list, scrollable */}
      {sale.items?.length > 0 && (
        <div className="no-print bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Products in this sale</p>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto overflow-x-hidden rounded-md border border-gray-100 bg-gray-50/50 p-2">
            {sale.items.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
              >
                {item.product?.name || "Unknown"}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* When PENDING: message only; when PAID: receipt + print button already in header */}
      {sale.paymentStatus === "PENDING" && (
        <div className="no-print bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
          Complete payment above to print receipt.
        </div>
      )}

      {sale.paymentStatus === "PAID" && (
        <ReceiptView sale={sale} payment={payment} />
      )}

      <div className="no-print flex gap-4">
        <Link
          href="/dashboard/sales"
          className="bg-gray-200 text-gray-800 px-6 py-3 rounded-md hover:bg-gray-300 transition-colors min-h-[44px] flex items-center justify-center text-base"
        >
          Back to Sales
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
    </div>
  );
}


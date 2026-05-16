"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";
import { exportToExcel } from "../../../../lib/exportExcel";
import { useAuth } from "../../../../contexts/AuthContext";
import SplitPaymentFields from "./SplitPaymentFields";
import { defaultLinesForTotal, validateLines, buildSplitPayload } from "../../../../lib/splitPayment";

export default function SalesListPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({
    productId: "",
    dateFrom: "",
    dateTo: "",
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalSale, setPaymentModalSale] = useState(null);
  const [paymentLines, setPaymentLines] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [saleToEdit, setSaleToEdit] = useState(null);
  const [editPaymentMethod, setEditPaymentMethod] = useState('CASH');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  useEffect(() => {
    loadData();
  }, [filters]);

  useEffect(() => {
    apiClient.products.getAll().then((res) => setProducts(res.data || [])).catch(() => {});
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const params = {};
      if (filters.productId) params.productId = filters.productId;
      if (filters.dateFrom && filters.dateTo) {
        params.dateFrom = filters.dateFrom;
        params.dateTo = filters.dateTo;
      }

      const salesRes = await apiClient.sales.getAll(params);
      const list = Array.isArray(salesRes?.data) ? salesRes.data : (salesRes?.data ? [salesRes.data] : []);
      setSales(list);

    } catch (error) {
      console.error("Error loading sales:", error);
      toast.error("Failed to load sales");
    } finally {
      setLoading(false);
    }
  };

  const openRecordPaymentModal = (sale) => {
    const total = parseFloat(sale.totalAmount || 0);
    setPaymentModalSale({ saleId: sale.id, totalAmount: sale.totalAmount });
    setPaymentLines(defaultLinesForTotal(total));
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentModalSale(null);
    setPaymentLines([]);
  };

  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentModalSale) return;
    const validation = validateLines(paymentLines, paymentModalSale.totalAmount);
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }
    try {
      setSubmitting(true);
      await apiClient.payments.createSplit(
        buildSplitPayload(paymentModalSale.saleId, paymentLines),
      );
      toast.success("Payment recorded successfully");
      closePaymentModal();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditSale = (sale) => {
    setSaleToEdit(sale);
    setEditPaymentMethod(sale.paymentMethod || 'CASH');
  };

  const handleSaveEditSale = async (e) => {
    e.preventDefault();
    if (!saleToEdit) return;
    try {
      setSubmittingEdit(true);
      await apiClient.sales.update(saleToEdit.id, { paymentMethod: editPaymentMethod });
      toast.success("Sale updated");
      setSaleToEdit(null);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update sale");
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDeleteSale = async (sale) => {
    if (!confirm(`Delete sale ${sale.saleNumber}? Only unpaid sales can be deleted.`)) return;
    try {
      await apiClient.sales.delete(sale.id);
      toast.success("Sale deleted");
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete sale");
    }
  };

  if (loading) {
    return (
      <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading sales...</div>
      </div>
    );
  }

  return (
    <div className="w-full lg:p-2 space-y-4 sm:space-y-8 bg-gray-50 min-h-screen">
      <div className="mb-4 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Sales
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">View and manage all sales</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              const rows = sales.map((s) => ({
                saleNumber: s.saleNumber,
                date: s.soldAt ? new Date(s.soldAt).toLocaleString() : "",
                itemsCount: s.items?.length ?? 0,
                totalAmount: parseFloat(s.totalAmount || 0),
                paymentMethod: s.paymentMethod || "",
                paymentStatus: s.paymentStatus,
              }));
              const dateStr = new Date().toISOString().split("T")[0];
              exportToExcel(
                rows,
                [
                  { key: "saleNumber", label: "Sale #" },
                  { key: "date", label: "Date" },
                  { key: "itemsCount", label: "Items" },
                  { key: "totalAmount", label: "Total (KES)" },
                  { key: "paymentMethod", label: "Payment method" },
                  { key: "paymentStatus", label: "Payment status" },
                ],
                `sales-export-${dateStr}`
              );
              toast.success("Excel exported");
            }}
            className="flex-1 sm:flex-none bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium min-h-[44px]"
          >
            Export Excel
          </button>
          <Link
            href="/dashboard/sales/new"
            className="flex-1 sm:flex-none bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm text-center min-h-[44px] flex items-center justify-center"
          >
            New Sale
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product
            </label>
            <select
              value={filters.productId}
              onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
            >
              <option value="">All products</option>
              {(products || []).filter((p) => p.isActive !== false).map((p) => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
            />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
            />
          </div>
          <button
            type="button"
            onClick={() => setFilters({ productId: "", dateFrom: "", dateTo: "" })}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 text-sm font-medium min-h-[44px]"
          >
            Clear filters
          </button>
          {!filters.productId && !filters.dateFrom && !filters.dateTo && (
            <p className="text-sm text-gray-500 self-center">Showing all sales</p>
          )}
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale #</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[180px] max-w-[220px]">Products</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 sm:px-6 py-4 text-center text-gray-500">
                    No sales found
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sale.saleNumber}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="sm:hidden">{new Date(sale.soldAt).toLocaleDateString()}</span>
                      <span className="hidden sm:inline">{new Date(sale.soldAt).toLocaleString()}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900">{sale.customer?.name || 'Walk-in'}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(sale.customer?.isWholesale || sale.customer?.type === 'WHOLESALE') && (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-purple-100 text-purple-800">Wholesale</span>
                        )}
                        {(sale.paymentMethod === 'CREDIT' || sale.customer?.creditEnabled || sale.customer?.type === 'CREDIT') && (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-amber-100 text-amber-800">Credit</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm w-[180px] max-w-[220px]">
                      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto overflow-x-hidden border border-gray-100 rounded-md p-1.5 bg-gray-50/50">
                        {(sale.items || []).map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap"
                          >
                            {item.product?.name || "Unknown"}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      KES {parseFloat(sale.totalAmount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-600 mb-1">{sale.paymentMethod || '—'}</div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        sale.paymentStatus === 'PAID' 
                          ? 'bg-green-100 text-green-800' 
                          : sale.paymentStatus === 'PARTIAL'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sale.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Link
                          href={`/dashboard/sales/${sale.id}`}
                          className="text-blue-600 hover:text-blue-800 min-h-[44px] flex items-center"
                        >
                          View
                        </Link>
                        {sale.paymentStatus === 'PENDING' && (
                          <button
                            onClick={() => openRecordPaymentModal(sale)}
                            className="text-green-600 hover:text-green-800 min-h-[44px] text-left sm:text-left"
                          >
                            Record Payment
                          </button>
                        )}
                        {isAdmin && sale.paymentStatus === 'PENDING' && (
                          <button
                            onClick={() => handleOpenEditSale(sale)}
                            className="text-gray-700 hover:text-gray-900 min-h-[44px] text-left sm:text-left"
                          >
                            Edit
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteSale(sale)}
                            className="text-red-600 hover:text-red-800 min-h-[44px] text-left sm:text-left"
                            title="Only unpaid sales can be deleted"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Sale Modal (admin only) */}
      {saleToEdit && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Edit Sale {saleToEdit.saleNumber}</h2>
            <p className="text-sm text-gray-600 mb-4">Unpaid sales: change payment method only.</p>
            <form onSubmit={handleSaveEditSale} className="space-y-4">
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
                  onClick={() => setSaleToEdit(null)}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-3 rounded-md hover:bg-gray-300 min-h-[44px] text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex-1 bg-blue-900 text-white px-4 py-3 rounded-md hover:bg-blue-800 disabled:opacity-50 min-h-[44px] text-base"
                >
                  {submittingEdit ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && paymentModalSale && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Record Payment</h2>
            <p className="text-sm text-gray-600 mb-4">
              Amount: KES {parseFloat(paymentModalSale.totalAmount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
                        <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              <SplitPaymentFields
                lines={paymentLines}
                onChange={setPaymentLines}
                saleTotal={paymentModalSale.totalAmount}
              />
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
                  {submitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


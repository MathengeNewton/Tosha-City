"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";

export default function SalesListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [filters, setFilters] = useState({
    sessionId: null,
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get current session
      const sessionRes = await apiClient.stockSessions.getCurrent();
      const session = sessionRes.data;
      setCurrentSession(session);

      // Get sales
      const params = {};
      if (session) params.sessionId = session.id;
      if (filters.date) params.date = filters.date;

      const salesRes = await apiClient.sales.getAll(params);
      setSales(salesRes.data || []);

    } catch (error) {
      console.error("Error loading sales:", error);
      toast.error("Failed to load sales");
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (saleId, totalAmount) => {
    const method = prompt("Enter payment method (CASH or MPESA):");
    if (!method || !['CASH', 'MPESA'].includes(method.toUpperCase())) {
      toast.error("Invalid payment method");
      return;
    }

    let mpesaReference = null;
    if (method.toUpperCase() === 'MPESA') {
      mpesaReference = prompt("Enter MPESA reference:");
      if (!mpesaReference) {
        toast.error("MPESA reference is required");
        return;
      }
    }

    try {
      await apiClient.payments.create({
        saleId,
        amount: totalAmount,
        method: method.toUpperCase(),
        mpesaReference: mpesaReference || undefined,
      });
      toast.success("Payment recorded successfully");
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to record payment");
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
    <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Sales
          </h1>
          <p className="text-gray-600 mt-1">View and manage all sales</p>
        </div>
        <Link
          href="/dashboard/sales/new"
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
        >
          New Sale
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No sales found
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sale.saleNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(sale.soldAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {sale.items?.length || 0} item(s)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      KES {parseFloat(sale.totalAmount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        sale.paymentStatus === 'PAID' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sale.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/sales/${sale.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View
                        </Link>
                        {sale.paymentStatus === 'PENDING' && (
                          <button
                            onClick={() => handleRecordPayment(sale.id, sale.totalAmount)}
                            className="text-green-600 hover:text-green-800"
                          >
                            Record Payment
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
    </div>
  );
}


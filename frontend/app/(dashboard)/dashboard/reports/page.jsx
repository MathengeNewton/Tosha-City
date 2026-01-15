"use client";
import { useState, useEffect } from "react";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('sales');
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [salesReport, setSalesReport] = useState(null);
  const [stockReport, setStockReport] = useState(null);
  const [wastageReport, setWastageReport] = useState(null);
  const [weeklyComparison, setWeeklyComparison] = useState(null);

  useEffect(() => {
    loadReports();
  }, [activeTab, filters]);

  const loadReports = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'sales') {
        const res = await apiClient.reports.getSalesReport(filters);
        setSalesReport(res.data);
      } else if (activeTab === 'stock') {
        const res = await apiClient.reports.getStockReport(filters);
        setStockReport(res.data);
      } else if (activeTab === 'wastage') {
        const res = await apiClient.reports.getWastageReport(filters);
        setWastageReport(res.data);
      } else if (activeTab === 'weekly') {
        const res = await apiClient.reports.getWeeklyComparison();
        setWeeklyComparison(res.data);
      }
    } catch (error) {
      console.error("Error loading reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          Reports & Analytics
        </h1>
        <p className="text-gray-600 mt-1">View sales, stock, and wastage reports</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {['sales', 'stock', 'wastage', 'weekly'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-blue-900 text-blue-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)} Report
              </button>
            ))}
          </nav>
        </div>

        {/* Filters */}
        {activeTab !== 'weekly' && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Report Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading report...</div>
          ) : (
            <>
              {activeTab === 'sales' && salesReport && (
                <SalesReportView data={salesReport} />
              )}
              {activeTab === 'stock' && stockReport && (
                <StockReportView data={stockReport} />
              )}
              {activeTab === 'wastage' && wastageReport && (
                <WastageReportView data={wastageReport} />
              )}
              {activeTab === 'weekly' && weeklyComparison && (
                <WeeklyComparisonView data={weeklyComparison} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Sales Report Component
function SalesReportView({ data }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Total Sales</p>
          <p className="text-2xl font-bold text-gray-900">{data.summary?.totalSales || 0}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">
            KES {parseFloat(data.summary?.totalRevenue || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Unpaid Amount</p>
          <p className="text-2xl font-bold text-gray-900">
            KES {parseFloat(data.summary?.unpaidAmount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Paid Sales</p>
          <p className="text-2xl font-bold text-gray-900">{data.summary?.paidSales || 0}</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Product</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(data.salesByProduct || {}).map(([product, stats]) => (
                <tr key={product}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stats.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    KES {parseFloat(stats.revenue || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Stock Report Component
function StockReportView({ data }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock by Product</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opening</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incoming</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Closing</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wastage</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(data.stockByProduct || {}).map(([product, stats]) => (
                <tr key={product}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stats.opening}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stats.incoming}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stats.closing}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{stats.wastage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Wastage Report Component
function WastageReportView({ data }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Total Wastage</p>
          <p className="text-2xl font-bold text-gray-900">{data.summary?.totalWastage || 0}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Total Entries</p>
          <p className="text-2xl font-bold text-gray-900">{data.summary?.totalEntries || 0}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Products Affected</p>
          <p className="text-2xl font-bold text-gray-900">{data.summary?.productsAffected || 0}</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Wastage by Product</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entries</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(data.wastageByProduct || {}).map(([product, stats]) => (
                <tr key={product}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stats.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{stats.entries.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Weekly Comparison Component
function WeeklyComparisonView({ data }) {
  const revenueChange = data.comparison?.revenueChange || 0;
  const salesChange = data.comparison?.salesChange || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Week</h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              {new Date(data.currentWeek?.startDate).toLocaleDateString()} - {new Date(data.currentWeek?.endDate).toLocaleDateString()}
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {data.currentWeek?.totalSales || 0} Sales
            </p>
            <p className="text-xl font-semibold text-gray-700">
              KES {parseFloat(data.currentWeek?.totalRevenue || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Last Week</h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              {new Date(data.lastWeek?.startDate).toLocaleDateString()} - {new Date(data.lastWeek?.endDate).toLocaleDateString()}
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {data.lastWeek?.totalSales || 0} Sales
            </p>
            <p className="text-xl font-semibold text-gray-700">
              KES {parseFloat(data.lastWeek?.totalRevenue || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparison</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Revenue Change</p>
            <p className={`text-2xl font-bold ${revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {revenueChange >= 0 ? '+' : ''}{revenueChange}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Sales Change</p>
            <p className={`text-2xl font-bold ${salesChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {salesChange >= 0 ? '+' : ''}{salesChange}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


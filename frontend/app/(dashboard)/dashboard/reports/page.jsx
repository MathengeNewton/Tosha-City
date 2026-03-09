"use client";
import { useState, useEffect } from "react";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";
import { exportToExcel } from "../../../../lib/exportExcel";

function localDateStr(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const defaultReportFilters = () => ({
  startDate: localDateStr(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
  endDate: localDateStr(new Date()),
});

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('sales');
  const [filters, setFilters] = useState(defaultReportFilters());
  const [salesReport, setSalesReport] = useState(null);
  const [stockReport, setStockReport] = useState(null);
  const [wastageReport, setWastageReport] = useState(null);
  const [stockShareReport, setStockShareReport] = useState(null);
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
      } else if (activeTab === 'stock-share') {
        const res = await apiClient.reports.getStockShareReport(filters);
        setStockShareReport(res.data);
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
        <p className="text-gray-600 mt-1">View sales, stock, wastage, and stock share reports</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {['sales', 'stock', 'wastage', 'stock-share', 'weekly'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-blue-900 text-blue-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'stock-share' ? 'Stock Share' : tab.charAt(0).toUpperCase() + tab.slice(1)} Report
              </button>
            ))}
          </nav>
        </div>

        {/* Filters + Export */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-4 items-end">
            {activeTab !== 'weekly' && (
              <>
                <div className="min-w-[140px]">
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
                <div className="min-w-[140px]">
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
                <button
                  type="button"
                  onClick={() => setFilters(defaultReportFilters())}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 text-sm font-medium"
                >
                  Clear filters
                </button>
              </>
            )}
            <div className="ml-auto">
              <button
                type="button"
                onClick={() => {
                  const dateStr = new Date().toISOString().split('T')[0];
                  const range = `${filters.startDate || ''}-to-${filters.endDate || ''}`.replace(/^\-to\-$/, '');
                  if (activeTab === 'sales' && salesReport?.salesByProduct) {
                    const rows = Object.entries(salesReport.salesByProduct).map(([product, stats]) => ({
                      product,
                      quantity: stats.quantity,
                      revenue: parseFloat(stats.revenue || 0),
                    }));
                    exportToExcel(rows, [{ key: 'product', label: 'Product' }, { key: 'quantity', label: 'Quantity (kg)' }, { key: 'revenue', label: 'Revenue (KES)' }], `sales-report-${range || dateStr}`);
                    toast.success('Excel exported');
                  } else if (activeTab === 'stock' && stockReport?.stockByProduct) {
                    const rows = Object.entries(stockReport.stockByProduct).map(([product, stats]) => ({
                      product,
                      opening: stats.opening,
                      incoming: stats.incoming,
                      closing: stats.closing,
                      wastage: stats.wastage,
                    }));
                    exportToExcel(rows, [{ key: 'product', label: 'Product' }, { key: 'opening', label: 'Opening (kg)' }, { key: 'incoming', label: 'Incoming (kg)' }, { key: 'closing', label: 'Closing (kg)' }, { key: 'wastage', label: 'Wastage (kg)' }], `stock-report-${range || dateStr}`);
                    toast.success('Excel exported');
                  } else if (activeTab === 'wastage' && wastageReport?.wastageByProduct) {
                    const rows = Object.entries(wastageReport.wastageByProduct).map(([product, stats]) => ({
                      product,
                      quantity: stats.quantity,
                      entries: stats.entries?.length ?? 0,
                    }));
                    exportToExcel(rows, [{ key: 'product', label: 'Product' }, { key: 'quantity', label: 'Quantity (kg)' }, { key: 'entries', label: 'Entries' }], `wastage-report-${range || dateStr}`);
                    toast.success('Excel exported');
                  } else if (activeTab === 'stock-share' && stockShareReport?.entries) {
                    const rows = stockShareReport.entries.map((e) => ({
                      date: e.recordedAt ? new Date(e.recordedAt).toLocaleDateString() : '',
                      partner: e.partner,
                      product: e.product,
                      quantity: parseFloat(e.quantity || 0),
                      unit: e.unit,
                      paid: e.paid ? 'Yes' : 'No',
                      notes: e.notes || '',
                    }));
                    exportToExcel(rows, [
                      { key: 'date', label: 'Date' }, { key: 'partner', label: 'Partner' }, { key: 'product', label: 'Product' },
                      { key: 'quantity', label: 'Quantity' }, { key: 'unit', label: 'Unit' }, { key: 'paid', label: 'Paid' }, { key: 'notes', label: 'Notes' },
                    ], `stock-share-report-${range || dateStr}`);
                    toast.success('Excel exported');
                  } else if (activeTab === 'weekly' && weeklyComparison) {
                    const rows = [
                      { metric: 'Current Week Sales', value: weeklyComparison.currentWeek?.totalSales ?? 0 },
                      { metric: 'Current Week Revenue', value: weeklyComparison.currentWeek?.totalRevenue ?? 0 },
                      { metric: 'Last Week Sales', value: weeklyComparison.lastWeek?.totalSales ?? 0 },
                      { metric: 'Last Week Revenue', value: weeklyComparison.lastWeek?.totalRevenue ?? 0 },
                      { metric: 'Revenue Change %', value: weeklyComparison.comparison?.revenueChange ?? 0 },
                      { metric: 'Sales Change %', value: weeklyComparison.comparison?.salesChange ?? 0 },
                    ];
                    exportToExcel(rows, [{ key: 'metric', label: 'Metric' }, { key: 'value', label: 'Value' }], `weekly-report-${dateStr}`);
                    toast.success('Excel exported');
                  } else {
                    toast.info('Load the report first');
                  }
                }}
                className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 text-sm font-medium min-h-[44px]"
              >
                Export Excel
              </button>
            </div>
          </div>
        </div>

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
              {activeTab === 'stock-share' && stockShareReport && (
                <StockShareReportView data={stockShareReport} />
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
  const totalSales = Number(data.summary?.totalSales) || 0;
  const totalRevenue = parseFloat(data.summary?.totalRevenue) || 0;
  const unpaidAmount = parseFloat(data.summary?.unpaidAmount) || 0;
  const paidSales = Number(data.summary?.paidSales) || 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Sales</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{totalSales}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Revenue</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">
            KES {totalRevenue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Unpaid Amount</p>
          <p className="mt-1 text-2xl font-bold text-amber-700 tabular-nums">
            KES {unpaidAmount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Paid Sales</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{paidSales}</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Product</h3>
        <div className="space-y-6">
          {Object.entries(data.salesByProduct || {}).map(([product, stats]) => {
            // Sort price ranges
            const sortedRanges = Object.entries(stats.priceRanges || {})
              .sort(([a], [b]) => {
                const aStart = parseInt(a.split('-')[0]);
                const bStart = parseInt(b.split('-')[0]);
                return aStart - bStart;
              });

            return (
              <div key={product} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="mb-4">
                  <h4 className="text-md font-semibold text-gray-900">{product}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                    <div>
                      <p className="text-xs text-gray-600">Total Quantity</p>
                      <p className="text-sm font-semibold text-gray-900">{parseFloat(stats.quantity || 0).toFixed(2)} kg</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Total Revenue</p>
                      <p className="text-sm font-semibold text-gray-900">
                        KES {parseFloat(stats.revenue || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price Range (KES)</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity (kg)</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedRanges.length > 0 ? (
                        sortedRanges.map(([range, rangeStats]) => (
                          <tr key={range}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{range}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{rangeStats.count}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                              {parseFloat(rangeStats.quantity || 0).toFixed(2)} kg
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold text-gray-900">
                              KES {parseFloat(rangeStats.revenue || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-4 py-2 text-sm text-gray-500 text-center">No sales in this period</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Stock Report Component
function StockReportView({ data }) {
  const summary = data.summary || {};
  const byProduct = Object.entries(data.stockByProduct || {});

  return (
    <div className="space-y-8">
      {(summary.totalSalesByPrice != null || summary.totalSalesByKgs != null) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Sales by Price</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">
              KES {parseFloat(summary.totalSalesByPrice || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Sales by Kgs</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">
              {parseFloat(summary.totalSalesByKgs || 0).toFixed(2)} <span className="text-sm font-normal text-gray-500">kg</span>
            </p>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock by Product</h3>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Opening</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Incoming</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Closing</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Wastage</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sales (KES)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sales (kg)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {byProduct.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No stock data in this period
                  </td>
                </tr>
              ) : (
                byProduct.map(([product, stats]) => (
                  <tr key={product} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right tabular-nums">{parseFloat(stats.opening || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right tabular-nums">{parseFloat(stats.incoming || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right tabular-nums">{parseFloat(stats.closing || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right tabular-nums">{parseFloat(stats.wastage || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right tabular-nums">
                      KES {parseFloat(stats.salesByPrice || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right tabular-nums">
                      {parseFloat(stats.salesByKgs || 0).toFixed(2)}
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

// Wastage Report Component
function WastageReportView({ data }) {
  const totalWastage = Number(data.summary?.totalWastage) || 0;
  const totalEntries = Number(data.summary?.totalEntries) || 0;
  const productsAffected = Number(data.summary?.productsAffected) || 0;
  const byProduct = Object.entries(data.wastageByProduct || {});

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Wastage</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">
            {totalWastage.toFixed(2)} <span className="text-sm font-normal text-gray-500">kg</span>
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Entries</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{totalEntries}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Products Affected</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{productsAffected}</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Wastage by Product</h3>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Quantity (kg)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Entries</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {byProduct.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    No wastage in this period
                  </td>
                </tr>
              ) : (
                byProduct.map(([product, stats]) => (
                  <tr key={product} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right tabular-nums">
                      {parseFloat(stats.quantity ?? 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right tabular-nums">
                      {Array.isArray(stats.entries) ? stats.entries.length : 0}
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

// Stock Share Report Component
function StockShareReportView({ data }) {
  const summary = data.summary || {};
  const byPartner = data.byPartner || [];
  const byProduct = data.byProduct || [];
  const entries = data.entries || [];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Shared (kg)</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">
            {Number(summary.totalQuantity || 0).toFixed(2)}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Entries</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{summary.totalEntries ?? 0}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Partners</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{summary.partnersCount ?? 0}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Products</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{summary.productsCount ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">By Partner</h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity (kg)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Entries</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid / Unpaid</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {byPartner.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No data</td></tr>
                ) : (
                  byPartner.map((row) => (
                    <tr key={row.partner} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.partner}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums">{Number(row.quantity || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums">{row.entries ?? 0}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">{row.paid ?? 0} / {row.unpaid ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">By Product</h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity (kg)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Entries</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {byProduct.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">No data</td></tr>
                ) : (
                  byProduct.map((row) => (
                    <tr key={row.product} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.product}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums">{Number(row.quantity || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums">{row.entries ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Stock Share Entries</h3>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No entries in this period</td></tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm text-gray-900">{e.recordedAt ? new Date(e.recordedAt).toLocaleDateString() : '–'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{e.partner || '–'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{e.product || '–'}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">{Number(e.quantity || 0).toFixed(2)} {e.unit || 'kg'}</td>
                    <td className="px-4 py-3"><span className={e.paid ? 'text-green-600 font-medium' : 'text-amber-600'}>{e.paid ? 'Yes' : 'No'}</span></td>
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

// Weekly Comparison Component
function WeeklyComparisonView({ data }) {
  const revenueChange = Number(data.comparison?.revenueChange) || 0;
  const salesChange = Number(data.comparison?.salesChange) || 0;
  const current = data.currentWeek || {};
  const last = data.lastWeek || {};

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Week</h3>
          <p className="text-sm text-gray-500 mb-2">
            {current.startDate && new Date(current.startDate).toLocaleDateString()} – {current.endDate && new Date(current.endDate).toLocaleDateString()}
          </p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{current.totalSales ?? 0} sales</p>
          <p className="text-xl font-semibold text-gray-700 tabular-nums mt-1">
            KES {parseFloat(current.totalRevenue || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Last Week</h3>
          <p className="text-sm text-gray-500 mb-2">
            {last.startDate && new Date(last.startDate).toLocaleDateString()} – {last.endDate && new Date(last.endDate).toLocaleDateString()}
          </p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{last.totalSales ?? 0} sales</p>
          <p className="text-xl font-semibold text-gray-700 tabular-nums mt-1">
            KES {parseFloat(last.totalRevenue || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparison</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Revenue Change</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {revenueChange >= 0 ? '+' : ''}{revenueChange}%
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Sales Change</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${salesChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {salesChange >= 0 ? '+' : ''}{salesChange}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


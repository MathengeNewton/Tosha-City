"use client";
import { useState, useEffect } from "react";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";
import { exportToExcel } from "../../../../lib/exportExcel";
import { PageShell, PageHeader } from "../../components/shell";

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
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState(defaultReportFilters());
  const [salesReport, setSalesReport] = useState(null);
  const [stockReport, setStockReport] = useState(null);
  const [wastageReport, setWastageReport] = useState(null);
  const [stockShareReport, setStockShareReport] = useState(null);
  const [productionReport, setProductionReport] = useState(null);
  const [weeklyComparison, setWeeklyComparison] = useState(null);
  const [kitchenReport, setKitchenReport] = useState(null);
  const [kitchenSessionId, setKitchenSessionId] = useState("");

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadReports();
  }, [activeTab, filters, kitchenSessionId]);

  const loadBranches = async () => {
    try {
      const res = await apiClient.branches.getAll({ activeOnly: true });
      setBranches(res.data || []);
    } catch (error) {
      console.error("Error loading branches:", error);
    }
  };

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
      } else if (activeTab === 'production') {
        const res = await apiClient.reports.getProductionReport(filters);
        setProductionReport(res.data);
      } else if (activeTab === 'weekly') {
        const res = await apiClient.reports.getWeeklyComparison();
        setWeeklyComparison(res.data);
      } else if (activeTab === 'kitchen') {
        if (!kitchenSessionId.trim()) {
          setKitchenReport(null);
        } else {
          const res = await apiClient.reports.getKitchenReport(kitchenSessionId.trim());
          setKitchenReport(res.data);
        }
      }
    } catch (error) {
      console.error("Error loading reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell className="space-y-8">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Track branch performance across sales, stock, wastage, stock share, and production."
      />

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {['sales', 'stock', 'wastage', 'stock-share', 'production', 'weekly', 'kitchen'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-medium border-b-2 min-h-[48px] ${
                  activeTab === tab
                    ? 'border-[#0D47A1] text-[#0D47A1]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'stock-share'
                  ? 'Stock Share'
                  : tab === 'kitchen'
                    ? 'Kitchen'
                    : tab.charAt(0).toUpperCase() + tab.slice(1)}{' '}
                {tab !== 'kitchen' ? 'Report' : ''}
              </button>
            ))}
          </nav>
        </div>

        {/* Filters + Export */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-4 items-end">
            {activeTab === 'kitchen' && (
              <div className="min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock session ID
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 42"
                  value={kitchenSessionId}
                  onChange={(e) => setKitchenSessionId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Pork branch session — open orders prep summary.</p>
              </div>
            )}
            {activeTab !== 'weekly' && activeTab !== 'kitchen' && (
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
                <div className="min-w-[180px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch
                  </label>
                  <select
                    value={filters.branchId || ""}
                    onChange={(e) => setFilters({ ...filters, branchId: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All branches</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
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
                      productionUsage: stats.productionUsage,
                    }));
                    exportToExcel(rows, [{ key: 'product', label: 'Product' }, { key: 'opening', label: 'Opening (kg)' }, { key: 'incoming', label: 'Incoming (kg)' }, { key: 'closing', label: 'Closing (kg)' }, { key: 'wastage', label: 'Wastage (kg)' }, { key: 'productionUsage', label: 'Production Usage (kg)' }], `stock-report-${range || dateStr}`);
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
                  } else if (activeTab === 'production' && productionReport?.entries) {
                    const rows = productionReport.entries.map((entry) => ({
                      branch: entry.branch || '',
                      recipe: entry.recipe || '',
                      finishedProduct: entry.finishedProduct || '',
                      expectedOutputQuantity: parseFloat(entry.expectedOutputQuantity || 0),
                      actualOutputQuantity: parseFloat(entry.actualOutputQuantity || 0),
                      wastedQuantity: parseFloat(entry.wastedQuantity || 0),
                      soldQuantity: parseFloat(entry.soldQuantity || 0),
                      remainingQuantity: parseFloat(entry.remainingQuantity || 0),
                    }));
                    exportToExcel(rows, [
                      { key: 'branch', label: 'Branch' },
                      { key: 'recipe', label: 'Recipe' },
                      { key: 'finishedProduct', label: 'Finished Product' },
                      { key: 'expectedOutputQuantity', label: 'Expected Output' },
                      { key: 'actualOutputQuantity', label: 'Actual Output' },
                      { key: 'wastedQuantity', label: 'Wastage' },
                      { key: 'soldQuantity', label: 'Sold' },
                      { key: 'remainingQuantity', label: 'Remaining' },
                    ], `production-report-${range || dateStr}`);
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
              {activeTab === 'production' && productionReport && (
                <ProductionReportView data={productionReport} />
              )}
              {activeTab === 'weekly' && weeklyComparison && (
                <WeeklyComparisonView data={weeklyComparison} />
              )}
              {activeTab === 'kitchen' && kitchenReport && (
                <KitchenReportView data={kitchenReport} />
              )}
              {activeTab === 'kitchen' && !kitchenReport && !loading && kitchenSessionId.trim() && (
                <p className="text-gray-500 text-sm">No data — check session ID or ensure it is a pork branch session.</p>
              )}
              {activeTab === 'kitchen' && !kitchenSessionId.trim() && !loading && (
                <p className="text-gray-500 text-sm">Enter a stock session ID to load kitchen prep summary.</p>
              )}
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}

// Sales Report Component
function SalesReportView({ data }) {
  const totalSales = Number(data.summary?.totalSales) || 0;
  const totalRevenue = parseFloat(data.summary?.totalRevenue) || 0;
  const unpaidAmount = parseFloat(data.summary?.unpaidAmount) || 0;
  const paidSales = Number(data.summary?.paidSales) || 0;
  const byBranch = data.byBranch || [];

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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Branch</h3>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unpaid</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unpaid Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {byBranch.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">No branch sales data</td></tr>
              ) : (
                byBranch.map((row) => (
                  <tr key={row.branch}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.branch}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">{row.totalSales ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">{row.paidSales ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">{row.unpaidSales ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">{parseFloat(row.quantity || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 tabular-nums">KES {parseFloat(row.totalRevenue || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-sm text-right text-amber-700 tabular-nums">KES {parseFloat(row.unpaidAmount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
  const byBranch = data.byBranch || [];
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock by Branch</h3>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Opening</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Incoming</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Closing</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Wastage</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Production Use</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales (KES)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sales (kg)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {byBranch.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-500">No branch stock data</td></tr>
              ) : (
                byBranch.map((row) => (
                  <tr key={row.branch}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.branch}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">{parseFloat(row.opening || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">{parseFloat(row.incoming || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">{parseFloat(row.closing || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right text-red-600 tabular-nums">{parseFloat(row.wastage || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right text-purple-600 tabular-nums">{parseFloat(row.productionUsage || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 tabular-nums">KES {parseFloat(row.salesByPrice || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">{parseFloat(row.salesByKgs || 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Production Use</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sales (KES)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sales (kg)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {byProduct.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 text-right tabular-nums">{parseFloat(stats.productionUsage || 0).toFixed(2)}</td>
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

function KitchenReportView({ data }) {
  const rows = data.byProduct || [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500">Dine-in orders (open)</p>
          <p className="text-2xl font-bold">{data.dineInOrders ?? 0}</p>
        </div>
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500">Takeaway orders (open)</p>
          <p className="text-2xl font-bold">{data.takeawayOrders ?? 0}</p>
        </div>
      </div>
      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b bg-gray-50 font-medium text-sm">Unserved prep by product</div>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Total qty</th>
              <th className="px-4 py-2">Queued</th>
              <th className="px-4 py-2">Cooking</th>
              <th className="px-4 py-2">Ready</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-gray-500 text-center">
                  No unserved lines for this session.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.productId} className="border-b">
                  <td className="px-4 py-2">{row.productName}</td>
                  <td className="px-4 py-2 tabular-nums">{row.quantity}</td>
                  <td className="px-4 py-2 tabular-nums">{row.queued}</td>
                  <td className="px-4 py-2 tabular-nums">{row.cooking}</td>
                  <td className="px-4 py-2 tabular-nums">{row.ready}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

function ProductionReportView({ data }) {
  const summary = data.summary || {};
  const byBranch = data.byBranch || [];
  const byProduct = data.byProduct || [];
  const byRecipe = data.byRecipe || [];
  const entries = data.entries || [];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Runs</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{summary.totalRuns ?? 0}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Expected Output</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{parseFloat(summary.totalExpectedOutput || 0).toFixed(2)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Output</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{parseFloat(summary.totalOutput || 0).toFixed(2)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Sold</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{parseFloat(summary.totalSold || 0).toFixed(2)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Remaining</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{parseFloat(summary.totalRemaining || 0).toFixed(2)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Productivity</p>
          <p className="mt-1 text-2xl font-bold text-blue-900 tabular-nums">{parseFloat(summary.productivity || 0).toFixed(2)}%</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Sell Through</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums">{parseFloat(summary.sellThrough || 0).toFixed(2)}%</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Wastage Rate</p>
          <p className="mt-1 text-2xl font-bold text-amber-700 tabular-nums">{parseFloat(summary.wastageRate || 0).toFixed(2)}%</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Branch Productivity</h3>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Runs</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expected</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sold</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Productivity</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sell Through</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Wastage</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {byBranch.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-6 text-center text-gray-500">No branch productivity data</td></tr>
              ) : (
                byBranch.map((row) => (
                  <tr key={row.branch}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.branch}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">{row.runs ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">{parseFloat(row.expectedOutput || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">{parseFloat(row.output || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">{parseFloat(row.sold || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">{parseFloat(row.remaining || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-blue-900 tabular-nums">{parseFloat(row.productivity || 0).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-emerald-700 tabular-nums">{parseFloat(row.sellThrough || 0).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-amber-700 tabular-nums">{parseFloat(row.wastageRate || 0).toFixed(2)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">By Product</h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Output</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sold</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {byProduct.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No production data</td></tr>
                ) : (
                  byProduct.map((row) => (
                    <tr key={row.product}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.product}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums">{parseFloat(row.output || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums">{parseFloat(row.sold || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums">{parseFloat(row.remaining || 0).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">By Recipe</h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipe</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Runs</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Output</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Wastage</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {byRecipe.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No production data</td></tr>
                ) : (
                  byRecipe.map((row) => (
                    <tr key={row.recipe}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.recipe}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums">{row.runs ?? 0}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums">{parseFloat(row.output || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums text-red-600">{parseFloat(row.wastage || 0).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Entries</h3>
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipe</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sold</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No production entries</td></tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-sm text-gray-700">{entry.branch || '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{entry.recipe || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{entry.finishedProduct || '—'}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">{parseFloat(entry.actualOutputQuantity || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">{parseFloat(entry.soldQuantity || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums">{parseFloat(entry.remainingQuantity || 0).toFixed(2)}</td>
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


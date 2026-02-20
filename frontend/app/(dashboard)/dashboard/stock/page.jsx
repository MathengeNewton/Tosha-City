"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";
import { exportToExcel, exportToExcelMultiSheet } from "../../../../lib/exportExcel";
import { useAuth } from "../../../../contexts/AuthContext";
import CurrentSessionBanner from "../../components/CurrentSessionBanner";

const defaultEnd = new Date();
const defaultStart = new Date();
defaultStart.setDate(defaultStart.getDate() - 30);

function filterByDateRange(items, dateFrom, dateTo, dateKey = "recordedAt") {
  if (!dateFrom && !dateTo) return items;
  return items.filter((item) => {
    const d = item[dateKey] ? new Date(item[dateKey]) : null;
    if (!d) return true;
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (d < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (d > to) return false;
    }
    return true;
  });
}

export default function StockManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams.get('sessionId');
  const viewParam = searchParams.get('view');
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const canManageEntries = isAdmin || hasRole('cashier'); // Cashiers can add/edit stock entries
  
  const [loading, setLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [allSessions, setAllSessions] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [stockEntries, setStockEntries] = useState([]);
  const [sales, setSales] = useState([]);
  const [currentSessionSales, setCurrentSessionSales] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('stockViewMode') || (viewParam || 'list');
    }
    return viewParam || 'list';
  });
  const [filters, setFilters] = useState({
    dateFrom: defaultStart.toISOString().split("T")[0],
    dateTo: defaultEnd.toISOString().split("T")[0],
    status: '',
    search: '',
  });
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(10);
  const [calendarWeek, setCalendarWeek] = useState(new Date());
  const [showSessionPopup, setShowSessionPopup] = useState(false);
  const [popupSession, setPopupSession] = useState(null);

  const filteredStockEntries = useMemo(
    () => filterByDateRange(stockEntries, filters.dateFrom, filters.dateTo, "recordedAt"),
    [stockEntries, filters.dateFrom, filters.dateTo]
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (sessionIdParam) {
      loadSessionDetails(parseInt(sessionIdParam));
    }
  }, [sessionIdParam]);

  // Reload sessions when filters change (skip initial load)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadSessions();
    }, 100);
    return () => clearTimeout(timer);
  }, [filters.dateFrom, filters.dateTo, filters.status]);

  const loadSessions = async () => {
    try {
      const allSessionsRes = await apiClient.stockSessions.getAll({
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        status: filters.status || undefined,
      });
      setAllSessions(allSessionsRes.data || []);
    } catch (error) {
      console.error("Error loading sessions:", error);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('stockViewMode', viewMode);
    }
    if (viewMode !== viewParam) {
      const params = new URLSearchParams(searchParams.toString());
      if (viewMode === 'list') {
        params.set('view', 'list');
      } else {
        params.set('view', 'calendar');
      }
      router.replace(`/dashboard/stock?${params.toString()}`);
    }
  }, [viewMode]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get all sessions for list/calendar views first (this also helps us get stats)
      await loadSessions();

      // Get current session
      const sessionRes = await apiClient.stockSessions.getCurrent();
      const session = sessionRes.data;
      
      if (session) {
        // Fetch stats for current session by getting all sessions for that date
        const allSessionsRes = await apiClient.stockSessions.getAll({
          dateFrom: new Date(session.date).toISOString().split("T")[0],
          dateTo: new Date(session.date).toISOString().split("T")[0],
        });
        const sessionsWithStats = allSessionsRes.data || [];
        const sessionWithStats = sessionsWithStats.find(s => s.id === session.id);
        setCurrentSession(sessionWithStats || session);
        
        // Fetch sales for current session to show detailed breakdown
        try {
          const salesRes = await apiClient.sales.getAll({ sessionId: session.id });
          setCurrentSessionSales(salesRes.data || []);
        } catch (error) {
          console.error("Error loading current session sales:", error);
          setCurrentSessionSales([]);
        }
      } else {
        setCurrentSession(null);
        setCurrentSessionSales([]);
      }

      // Get products
      const productsRes = await apiClient.products.getActive();
      setProducts(productsRes.data || []);

      // Get suppliers
      const suppliersRes = await apiClient.suppliers.getAll({ activeOnly: true });
      setSuppliers(suppliersRes.data || []);

    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetails = async (sessionId) => {
    try {
      const sessionRes = await apiClient.stockSessions.getById(sessionId);
      setSelectedSession(sessionRes.data);
      const entriesRes = await apiClient.stockEntries.getAll({ sessionId });
      setStockEntries(entriesRes.data || []);
      
      // Load sales for this session
      const salesRes = await apiClient.sales.getAll({ sessionId });
      setSales(salesRes.data || []);
    } catch (error) {
      console.error("Error loading session:", error);
      toast.error("Failed to load session details");
    }
  };

  const handleOpenSession = async () => {
    try {
      await apiClient.stockSessions.open({});
      toast.success("Stock session opened successfully");
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to open session");
    }
  };

  const handleCloseSession = async () => {
    if (!currentSession) return;
    
    if (!confirm("Are you sure you want to close this session? Make sure all sales are paid and closing stock is recorded.")) {
      return;
    }

    try {
      await apiClient.stockSessions.close(currentSession.id);
      toast.success("Stock session closed successfully");
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to close session");
    }
  };

  const handleViewSession = (session) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sessionId', session.id.toString());
    router.push(`/dashboard/stock?${params.toString()}`);
  };

  const handleBackToList = () => {
    const params = new URLSearchParams();
    params.set('view', viewMode);
    router.push(`/dashboard/stock?${params.toString()}`);
    setSelectedSession(null);
  };

  const handleCalendarDayClick = (session) => {
    if (session) {
      setPopupSession(session);
      setShowSessionPopup(true);
    }
  };

  // Filter sessions for list view
  const filteredSessions = useMemo(() => {
    let filtered = allSessions;
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(s => 
        s.openedBy?.username?.toLowerCase().includes(searchLower) ||
        s.openedBy?.email?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [allSessions, filters.search]);

  // Paginate sessions
  const paginatedSessions = useMemo(() => {
    const start = (listPage - 1) * listPageSize;
    const end = start + listPageSize;
    return filteredSessions.slice(start, end);
  }, [filteredSessions, listPage, listPageSize]);

  const totalPages = Math.ceil(filteredSessions.length / listPageSize);

  // Get sessions for current calendar week
  const getWeekSessions = () => {
    const weekStart = new Date(calendarWeek);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return allSessions.filter(session => {
      const sessionDate = new Date(session.date);
      return sessionDate >= weekStart && sessionDate <= weekEnd;
    });
  };

  const weekSessions = getWeekSessions();

  const getWeekDays = () => {
    const weekStart = new Date(calendarWeek);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays();

  const getSessionForDay = (day) => {
    const dayStr = day.toISOString().split('T')[0];
    return weekSessions.find(s => {
      const sessionDate = new Date(s.date).toISOString().split('T')[0];
      return sessionDate === dayStr;
    });
  };

  const navigateWeek = (direction) => {
    const newWeek = new Date(calendarWeek);
    newWeek.setDate(newWeek.getDate() + (direction * 7));
    setCalendarWeek(newWeek);
  };

  if (loading) {
    return (
      <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // If sessionId is in URL, show session details
  if (sessionIdParam && selectedSession) {
    const openingEntries = stockEntries.filter(e => e.type === 'OPENING');
    const incomingEntries = stockEntries.filter(e => e.type === 'INCOMING');
    const closingEntries = stockEntries.filter(e => e.type === 'CLOSING');
    const wastageEntries = stockEntries.filter(e => e.type === 'WASTAGE');

    const incomingKg = incomingEntries.reduce((sum, e) => sum + parseFloat(e.quantity || 0), 0);
    const soldKg = sales.reduce((total, s) => total + (s.items || []).reduce((sum, it) => sum + parseFloat(it.quantity || 0), 0), 0);
    const availableKg = closingEntries.reduce((sum, e) => sum + parseFloat(e.quantity || 0), 0);

    const handleCloseSession = async () => {
      if (!confirm("Are you sure you want to close this session? Make sure all sales are paid and closing stock is recorded.")) {
        return;
      }

      try {
        await apiClient.stockSessions.close(selectedSession.id);
        toast.success("Stock session closed successfully");
        loadSessionDetails(selectedSession.id);
        loadData();
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to close session");
      }
    };

    const handleDeleteSession = async () => {
      if (!confirm(`Delete this session (${new Date(selectedSession.date).toLocaleDateString()})? Only allowed if it has no stock entries or sales.`)) return;
      try {
        await apiClient.stockSessions.delete(selectedSession.id);
        toast.success('Session deleted');
        handleBackToList();
        loadData();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete session');
      }
    };

    const handleExportSession = () => {
      const sessionDate = new Date(selectedSession.date).toISOString().split("T")[0];
      const summaryRows = [
        { field: "Date", value: new Date(selectedSession.date).toLocaleDateString() },
        { field: "Opened by", value: selectedSession.openedBy?.username || selectedSession.openedBy?.email || "N/A" },
        { field: "Status", value: selectedSession.status },
        { field: "Incoming stock (kg)", value: incomingKg.toFixed(2) },
        { field: "Stock sold (kg)", value: soldKg.toFixed(2) },
        { field: "Available stock (kg)", value: availableKg.toFixed(2) },
        { field: "Wastage entries", value: wastageEntries.length },
      ];
      const entryRows = stockEntries.map((e) => ({
        product: e.product?.name || "N/A",
        type: e.type,
        quantity: parseFloat(e.quantity || 0),
        unit: e.unit || "kg",
        recordedAt: e.recordedAt ? new Date(e.recordedAt).toLocaleString() : "",
        notes: e.notes || "",
      }));
      const salesRows = sales.map((s) => ({
        saleNumber: s.saleNumber,
        soldAt: s.soldAt ? new Date(s.soldAt).toLocaleString() : "",
        totalAmount: parseFloat(s.totalAmount || 0),
        paymentMethod: s.paymentMethod || "",
        paymentStatus: s.paymentStatus || "",
        itemsCount: s.items?.length ?? 0,
      }));
      exportToExcelMultiSheet(
        [
          {
            sheetName: "Session summary",
            rows: summaryRows,
            columns: [
              { key: "field", label: "Field" },
              { key: "value", label: "Value" },
            ],
          },
          {
            sheetName: "Stock entries",
            rows: entryRows,
            columns: [
              { key: "product", label: "Product" },
              { key: "type", label: "Type" },
              { key: "quantity", label: "Quantity" },
              { key: "unit", label: "Unit" },
              { key: "recordedAt", label: "Recorded at" },
              { key: "notes", label: "Notes" },
            ],
          },
          {
            sheetName: "Sales",
            rows: salesRows,
            columns: [
              { key: "saleNumber", label: "Sale #" },
              { key: "soldAt", label: "Sold at" },
              { key: "totalAmount", label: "Total (KES)" },
              { key: "paymentMethod", label: "Payment method" },
              { key: "paymentStatus", label: "Payment status" },
              { key: "itemsCount", label: "Items" },
            ],
          },
        ],
        `session-${sessionDate}`
      );
      toast.success("Session exported to Excel");
    };

    return (
      <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <button
              onClick={handleBackToList}
              className="mb-4 text-blue-900 hover:text-blue-700 flex items-center gap-2"
            >
              ← Back to {viewMode === 'list' ? 'List' : 'Calendar'} View
            </button>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Session Details
            </h1>
            <p className="text-gray-600 mt-1">
              {new Date(selectedSession.date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportSession}
              className="bg-gray-700 text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium min-h-[44px] whitespace-nowrap"
            >
              Export Excel
            </button>
            {isAdmin && (
              <button
                onClick={handleDeleteSession}
                className="bg-red-500 text-white px-6 py-3 rounded-md hover:bg-red-600 transition-colors text-sm font-medium min-h-[44px] whitespace-nowrap"
              >
                Delete Session
              </button>
            )}
            {selectedSession.status === 'OPEN' && isAdmin && (
              <button
                onClick={handleCloseSession}
                className="bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 transition-colors text-sm font-medium min-h-[44px] whitespace-nowrap"
              >
                Close Session
              </button>
            )}
          </div>
        </div>

        {/* Session Information Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Information</h3>
          <div className="mb-4 space-y-2">
            <p className="text-sm text-gray-600">
              Opened by: {selectedSession.openedBy?.username || selectedSession.openedBy?.email || 'N/A'}
            </p>
            <p className="text-sm text-gray-600">
              Status: <span className={`font-semibold ${
                selectedSession.status === 'OPEN' ? 'text-green-600' : 'text-gray-600'
              }`}>
                {selectedSession.status}
              </span>
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Incoming stock (kg)</p>
              <p className="text-2xl font-bold text-gray-900">{incomingKg.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Stock sold (kg)</p>
              <p className="text-2xl font-bold text-gray-900">{soldKg.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Available stock</p>
              <p className="text-2xl font-bold text-gray-900">{availableKg.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Wastage</p>
              <p className="text-2xl font-bold text-gray-900">{stockEntries.filter(e => e.type === 'WASTAGE').length} entries</p>
            </div>
          </div>
        </div>

        {/* Stock Entries with Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              {['overview', 'opening', 'incoming', 'closing', 'wastages', 'sales', 'production'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 sm:px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                    activeTab === tab
                      ? 'border-blue-900 text-blue-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab === 'overview' ? 'Overview' :
                   tab === 'opening' ? 'Opening Stock' : 
                   tab === 'incoming' ? 'Incoming Stock' :
                   tab === 'closing' ? 'Closing Stock' :
                   tab === 'wastages' ? 'Wastages' :
                   tab === 'sales' ? 'Sales' :
                   'Production'}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <SessionOverviewAnalytics 
                session={selectedSession}
                stockEntries={stockEntries}
                sales={sales}
                products={products}
              />
            )}
            {activeTab === 'opening' && (
              <div>
                {canManageEntries && selectedSession.status === 'OPEN' && (
                  <StockEntryForm 
                    session={selectedSession} 
                    products={products} 
                    type="OPENING"
                    onSuccess={() => loadSessionDetails(selectedSession.id)}
                  />
                )}
                <div className={canManageEntries && selectedSession.status === 'OPEN' ? "mt-6" : ""}>
                  {selectedSession?.sales?.length > 0 && canManageEntries && (
                    <p className="text-amber-700 text-sm mb-2 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                      Edit/delete for entries is locked when the session has sales. Adjust or remove sales first.
                    </p>
                  )}
                  <StockEntriesTable stockEntries={openingEntries} canEdit={canManageEntries && !(selectedSession?.sales?.length > 0)} onEdit={() => loadSessionDetails(selectedSession.id)} products={products} suppliers={[]} entryType="OPENING" />
                </div>
              </div>
            )}
            {activeTab === 'incoming' && (
              <div>
                {canManageEntries && selectedSession.status === 'OPEN' && (
                  <StockEntryForm 
                    session={selectedSession} 
                    products={products}
                    suppliers={suppliers}
                    type="INCOMING"
                    onSuccess={() => loadSessionDetails(selectedSession.id)}
                  />
                )}
                <div className={canManageEntries && selectedSession.status === 'OPEN' ? "mt-6" : ""}>
                  {selectedSession?.sales?.length > 0 && canManageEntries && (
                    <p className="text-amber-700 text-sm mb-2 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                      Edit/delete for entries is locked when the session has sales. Adjust or remove sales first.
                    </p>
                  )}
                  <StockEntriesTable stockEntries={incomingEntries} canEdit={canManageEntries && !(selectedSession?.sales?.length > 0)} onEdit={() => loadSessionDetails(selectedSession.id)} products={products} suppliers={suppliers} entryType="INCOMING" />
                </div>
              </div>
            )}
            {activeTab === 'closing' && (
              <div>
                {canManageEntries && selectedSession.status === 'OPEN' && (
                  <StockEntryForm 
                    session={selectedSession} 
                    products={products} 
                    type="CLOSING"
                    onSuccess={() => loadSessionDetails(selectedSession.id)}
                  />
                )}
                <div className={canManageEntries && selectedSession.status === 'OPEN' ? "mt-6" : ""}>
                  {selectedSession?.sales?.length > 0 && canManageEntries && (
                    <p className="text-amber-700 text-sm mb-2 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                      Edit/delete for entries is locked when the session has sales. Adjust or remove sales first.
                    </p>
                  )}
                  <StockEntriesTable stockEntries={closingEntries} canEdit={canManageEntries && !(selectedSession?.sales?.length > 0)} onEdit={() => loadSessionDetails(selectedSession.id)} products={products} suppliers={[]} entryType="CLOSING" />
                </div>
              </div>
            )}
            {activeTab === 'wastages' && (
              <div>
                {canManageEntries && selectedSession.status === 'OPEN' && (
                  <StockEntryForm 
                    session={selectedSession} 
                    products={products} 
                    type="WASTAGE"
                    onSuccess={() => loadSessionDetails(selectedSession.id)}
                  />
                )}
                <div className={canManageEntries && selectedSession.status === 'OPEN' ? "mt-6" : ""}>
                  {selectedSession?.sales?.length > 0 && canManageEntries && (
                    <p className="text-amber-700 text-sm mb-2 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                      Edit/delete for entries is locked when the session has sales. Adjust or remove sales first.
                    </p>
                  )}
                  <StockEntriesTable stockEntries={wastageEntries} canEdit={canManageEntries && !(selectedSession?.sales?.length > 0)} onEdit={() => loadSessionDetails(selectedSession.id)} products={products} suppliers={[]} entryType="WASTAGE" />
                </div>
              </div>
            )}
            {activeTab === 'sales' && (
              <SalesTable sales={sales} />
            )}
            {activeTab === 'production' && (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="text-6xl mb-4">🚧</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</h3>
                  <p className="text-gray-600">Production tracking feature is under development.</p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Stock Management
          </h1>
          <p className="text-gray-600 mt-1">Manage stock sessions and entries</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Calendar
            </button>
          </div>
          {!currentSession ? (
            <button
              onClick={handleOpenSession}
              className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors text-sm min-h-[44px]"
            >
              Open Stock Session
            </button>
          ) : currentSession.status === 'OPEN' ? (
            <button
              onClick={handleCloseSession}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm min-h-[44px]"
            >
              Close Session
            </button>
          ) : null}
        </div>
      </div>

      {/* Current Open Session Banner */}
      {currentSession && currentSession.status === 'OPEN' && (
        <CurrentSessionBanner 
          session={currentSession} 
          sales={currentSessionSales}
          onViewSession={() => handleViewSession(currentSession)}
        />
      )}

      {/* List View or Calendar View */}
      {viewMode === 'list' ? (
        <ListView 
          sessions={paginatedSessions}
          filters={filters}
          setFilters={setFilters}
          listPage={listPage}
          setListPage={setListPage}
          listPageSize={listPageSize}
          setListPageSize={setListPageSize}
          totalPages={totalPages}
          totalSessions={filteredSessions.length}
          onViewSession={handleViewSession}
          onRefresh={loadData}
          allSessions={filteredSessions}
          isAdmin={isAdmin}
        />
      ) : (
        <CalendarView
          weekDays={weekDays}
          weekSessions={weekSessions}
          getSessionForDay={getSessionForDay}
          calendarWeek={calendarWeek}
          navigateWeek={navigateWeek}
          onDayClick={handleCalendarDayClick}
        />
      )}

      {/* Session Popup Modal */}
      {showSessionPopup && popupSession && (
        <SessionPopup
          session={popupSession}
          onClose={() => {
            setShowSessionPopup(false);
            setPopupSession(null);
          }}
          onViewMore={() => {
            setShowSessionPopup(false);
            handleViewSession(popupSession);
          }}
        />
      )}


    </div>
  );
}

// List View Component
function ListView({ sessions, filters, setFilters, listPage, setListPage, listPageSize, setListPageSize, totalPages, totalSessions, onViewSession, onRefresh, allSessions, isAdmin }) {
  const handleDeleteSession = async (session) => {
    if (!confirm(`Delete session for ${new Date(session.date).toLocaleDateString()}? This is only allowed if it has no stock entries or sales.`)) return;
    try {
      await apiClient.stockSessions.delete(session.id);
      toast.success('Session deleted');
      onRefresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete session');
    }
  };

  // Calculate date range aggregated metrics
  const dateRangeMetrics = useMemo(() => {
    const totalOpeningStock = allSessions.reduce((sum, s) => sum + (s.stats?.openingStockCount || 0), 0);
    const totalIncomingStock = allSessions.reduce((sum, s) => sum + (s.stats?.incomingStockCount || 0), 0);
    const totalSales = allSessions.reduce((sum, s) => sum + (s.stats?.salesCount || 0), 0);
    const totalRevenue = allSessions.reduce((sum, s) => sum + parseFloat(s.stats?.totalRevenue || 0), 0);
    return { totalOpeningStock, totalIncomingStock, totalSales, totalRevenue };
  }, [allSessions]);

  const handleClearFilters = () => {
    setFilters({
      dateFrom: defaultStart.toISOString().split("T")[0],
      dateTo: defaultEnd.toISOString().split("T")[0],
      status: '',
      search: '',
    });
  };

  const handleExport = () => {
    const rows = allSessions.map((s) => ({
      date: new Date(s.date).toLocaleDateString(),
      openedBy: s.openedBy?.username || s.openedBy?.email || 'N/A',
      status: s.status,
      openingStock: s.stats?.openingStockCount || 0,
      incomingStock: s.stats?.incomingStockCount || 0,
      sales: s.stats?.salesCount || 0,
      revenue: parseFloat(s.stats?.totalRevenue || 0),
    }));
    const from = (filters.dateFrom || '').replace(/-/g, '');
    const to = (filters.dateTo || '').replace(/-/g, '');
    const filename = from && to ? `stock-sessions-${from}-to-${to}` : `stock-sessions-export-${new Date().toISOString().split('T')[0]}`;
    exportToExcel(
      rows,
      [
        { key: "date", label: "Date" },
        { key: "openedBy", label: "Opened By" },
        { key: "status", label: "Status" },
        { key: "openingStock", label: "Opening Stock" },
        { key: "incomingStock", label: "Incoming Stock" },
        { key: "sales", label: "Sales" },
        { key: "revenue", label: "Revenue (KES)" },
      ],
      filename
    );
    toast.success("Excel exported");
  };

  const hasActiveFilters = filters.status || filters.search || 
    filters.dateFrom !== defaultStart.toISOString().split("T")[0] ||
    filters.dateTo !== defaultEnd.toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Date Range Metrics Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Date Range Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Opening Stock</p>
            <p className="text-2xl font-bold text-gray-900">{dateRangeMetrics.totalOpeningStock} entries</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Incoming Stock</p>
            <p className="text-2xl font-bold text-gray-900">{dateRangeMetrics.totalIncomingStock} entries</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Sales</p>
            <p className="text-2xl font-bold text-gray-900">{dateRangeMetrics.totalSales}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">KES {dateRangeMetrics.totalRevenue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
              >
                <option value="">All</option>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search by user..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium min-h-[44px]"
            >
              Export Excel
            </button>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors text-sm min-h-[44px]"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opened By</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opening Stock</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incoming Stock</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sessions.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-4 sm:px-6 py-4 text-center text-gray-500">
                  No sessions found
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(session.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {session.openedBy?.username || session.openedBy?.email || 'N/A'}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      session.status === 'OPEN' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {session.status}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {session.stats?.openingStockCount || 0}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {session.stats?.incomingStockCount || 0}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {session.stats?.salesCount || 0}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    KES {parseFloat(session.stats?.totalRevenue || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        onClick={() => onViewSession(session)}
                        className="text-blue-900 hover:text-blue-700 font-medium min-h-[44px] px-3"
                      >
                        View
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteSession(session)}
                          className="text-red-600 hover:text-red-800 font-medium min-h-[44px] px-3"
                          title="Delete session (only if no entries/sales)"
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

        {/* Pagination */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Show</span>
            <select
              value={listPageSize}
              onChange={(e) => {
                setListPageSize(parseInt(e.target.value));
                setListPage(1);
              }}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-700">of {totalSessions} sessions</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setListPage(Math.max(1, listPage - 1))}
              disabled={listPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 min-h-[44px]"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {listPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setListPage(Math.min(totalPages, listPage + 1))}
              disabled={listPage >= totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 min-h-[44px]"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Calendar View Component
function CalendarView({ weekDays, weekSessions, getSessionForDay, calendarWeek, navigateWeek, onDayClick }) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      {/* Week Navigation */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigateWeek(-1)}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 min-h-[44px]"
        >
          ← Previous
        </button>
        <h3 className="text-lg font-semibold text-gray-900">
          {weekDays[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <button
          onClick={() => navigateWeek(1)}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 min-h-[44px]"
        >
          Next →
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 sm:gap-4">
        {dayNames.map((dayName, idx) => (
          <div key={idx} className="text-center text-sm font-medium text-gray-700 pb-2">
            {dayName}
          </div>
        ))}
        {weekDays.map((day, idx) => {
          const session = getSessionForDay(day);
          const isToday = day.toDateString() === new Date().toDateString();
          const opening = session?.stats?.openingStockCount ?? 0;
          const salesCount = session?.stats?.salesCount ?? 0;
          const revenue = parseFloat(session?.stats?.totalRevenue || 0);
          
          return (
            <div
              key={idx}
              onClick={() => session && onDayClick(session)}
              className={`min-h-[80px] sm:min-h-[110px] p-2 border rounded-lg cursor-pointer transition-colors ${
                session
                  ? session.status === 'OPEN'
                    ? 'bg-green-50 border-green-300 hover:bg-green-100'
                    : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                  : 'border-gray-200 hover:border-gray-300'
              } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                {day.getDate()}
              </div>
              {session && (
                <div className="text-xs space-y-1">
                  <div className={`inline-block px-2 py-0.5 rounded ${
                    session.status === 'OPEN' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'
                  }`}>
                    {session.status}
                  </div>
                  <div className="text-gray-600 leading-tight">
                    <div>Opening: {opening}</div>
                    <div>Sales: {salesCount} · KES {revenue.toLocaleString('en-KE', { maximumFractionDigits: 0 })}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Session Popup Modal
function SessionPopup({ session, onClose, onViewMore }) {
  if (!session) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-gray-900">Session Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="text-base font-semibold text-gray-900">
                {new Date(session.date).toLocaleDateString()}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Opened By</p>
              <p className="text-base font-semibold text-gray-900">
                {session.openedBy?.username || session.openedBy?.email || 'N/A'}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className={`text-base font-semibold ${
                session.status === 'OPEN' ? 'text-green-600' : 'text-gray-600'
              }`}>
                {session.status}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-gray-600">Opening Stock</p>
                <p className="text-lg font-bold text-gray-900">
                  {session.stats?.openingStockCount || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Incoming Stock</p>
                <p className="text-lg font-bold text-gray-900">
                  {session.stats?.incomingStockCount || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Sales Count</p>
                <p className="text-lg font-bold text-gray-900">
                  {session.stats?.salesCount || 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-lg font-bold text-gray-900">
                  KES {parseFloat(session.stats?.totalRevenue || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            
            <div className="pt-4 border-t flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 font-medium min-h-[44px]"
              >
                Close
              </button>
              <button
                onClick={onViewMore}
                className="flex-1 px-4 py-3 bg-blue-900 text-white rounded-md hover:bg-[#1e88b5] font-medium min-h-[44px]"
              >
                View More
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stock Entries Table Component
function StockEntriesTable({ stockEntries, canEdit = false, onEdit, products = [], suppliers = [], entryType }) {
  const [entryToEdit, setEntryToEdit] = useState(null);
  const [editForm, setEditForm] = useState({ productId: '', quantity: '', unit: 'kg', notes: '', supplierId: '' });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const handleOpenEdit = (entry) => {
    setEntryToEdit(entry);
    setEditForm({
      productId: String(entry.product?.id ?? entry.productId ?? ''),
      quantity: String(entry.quantity ?? ''),
      unit: entry.unit || 'kg',
      notes: entry.notes || '',
      supplierId: entry.supplierId ? String(entry.supplierId) : '',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!entryToEdit) return;
    const productId = parseInt(editForm.productId, 10);
    const quantity = parseFloat(editForm.quantity);
    if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Product and quantity are required');
      return;
    }
    try {
      setSubmittingEdit(true);
      const payload = {
        productId,
        quantity,
        unit: editForm.unit || 'kg',
        notes: editForm.notes || undefined,
      };
      if (entryType === 'INCOMING' && editForm.supplierId) {
        payload.supplierId = parseInt(editForm.supplierId, 10);
      }
      await apiClient.stockEntries.update(entryToEdit.id, payload);
      toast.success('Entry updated');
      setEntryToEdit(null);
      if (onEdit) onEdit();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update entry');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDelete = async (entryId) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await apiClient.stockEntries.delete(entryId);
      toast.success('Entry deleted successfully');
      if (onEdit) onEdit();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete entry');
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              {canEdit && (
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stockEntries.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="px-4 sm:px-6 py-4 text-center text-gray-500">
                  No stock entries yet
                </td>
              </tr>
            ) : (
              stockEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.product?.name || 'N/A'}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      entry.type === 'OPENING' ? 'bg-blue-100 text-blue-800' :
                      entry.type === 'INCOMING' ? 'bg-green-100 text-green-800' :
                      entry.type === 'CLOSING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {entry.type}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.quantity} {entry.unit}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(entry.recordedAt).toLocaleString()}
                  </td>
                  {canEdit && (
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEdit(entry)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit entry modal */}
      {entryToEdit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit {entryType} entry</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                <select
                  value={editForm.productId}
                  onChange={(e) => setEditForm({ ...editForm, productId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                  ))}
                </select>
              </div>
              {entryType === 'INCOMING' && suppliers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <select
                    value={editForm.supplierId}
                    onChange={(e) => setEditForm({ ...editForm, supplierId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={editForm.unit}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEntryToEdit(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 disabled:opacity-50"
                >
                  {submittingEdit ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Session Overview Analytics Component
function SessionOverviewAnalytics({ session, stockEntries, sales, products = [] }) {
  // Calculate comprehensive analytics
  const analytics = useMemo(() => {
    const openingEntries = stockEntries.filter(e => e.type === 'OPENING');
    const incomingEntries = stockEntries.filter(e => e.type === 'INCOMING');
    const closingEntries = stockEntries.filter(e => e.type === 'CLOSING');
    const wastageEntries = stockEntries.filter(e => e.type === 'WASTAGE');
    const byproductSaleEntries = stockEntries.filter(e => e.type === 'BYPRODUCT_SALE');

    // Sales statistics
    const totalSales = sales.length;
    const paidSales = sales.filter(s => s.paymentStatus === 'PAID');
    const pendingSales = sales.filter(s => s.paymentStatus === 'PENDING');
    const totalRevenue = paidSales.reduce((sum, s) => sum + parseFloat(s.totalAmount || 0), 0);
    const pendingRevenue = pendingSales.reduce((sum, s) => sum + parseFloat(s.totalAmount || 0), 0);

    // Calculate total quantities
    const totalOpeningQty = openingEntries.reduce((sum, e) => sum + parseFloat(e.quantity || 0), 0);
    const totalIncomingQty = incomingEntries.reduce((sum, e) => sum + parseFloat(e.quantity || 0), 0);
    const totalClosingQty = closingEntries.reduce((sum, e) => sum + parseFloat(e.quantity || 0), 0);
    const totalWastageQty = wastageEntries.reduce((sum, e) => sum + parseFloat(e.quantity || 0), 0);
    const byproductSaleQtyByProduct = {};
    byproductSaleEntries.forEach(e => {
      const pid = e.product?.id ?? e.productId;
      if (pid) {
        byproductSaleQtyByProduct[pid] = (byproductSaleQtyByProduct[pid] || 0) + parseFloat(e.quantity || 0);
      }
    });

    // Sales by product
    const salesByProduct = {};
    let totalSalesQuantity = 0;
    let totalSalesRevenue = 0;

    sales.forEach(sale => {
      sale.items?.forEach(item => {
        const productName = item.product?.name || 'Unknown';
        if (!salesByProduct[productName]) {
          salesByProduct[productName] = {
            name: productName,
            quantity: 0,
            revenue: 0,
            count: 0,
            avgPrice: 0,
          };
        }
        const qty = parseFloat(item.quantity || 0);
        const rev = parseFloat(item.totalPrice || 0);
        salesByProduct[productName].quantity += qty;
        salesByProduct[productName].revenue += rev;
        salesByProduct[productName].count += 1;
        totalSalesQuantity += qty;
        totalSalesRevenue += rev;
      });
    });

    // Calculate average price per kg for each product
    Object.values(salesByProduct).forEach((product) => {
      product.avgPrice = product.quantity > 0 ? (product.revenue / product.quantity) : 0;
    });

    // Sort products by revenue
    const topProducts = Object.values(salesByProduct)
      .sort((a, b) => b.revenue - a.revenue);

    // Payment method breakdown
    const paymentMethods = {};
    sales.forEach(sale => {
      const method = sale.paymentMethod || 'CASH';
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, revenue: 0 };
      }
      paymentMethods[method].count += 1;
      if (sale.paymentStatus === 'PAID') {
        paymentMethods[method].revenue += parseFloat(sale.totalAmount || 0);
      }
    });

    // Product breakdown: quantities sold and remaining per product
    const productBreakdown = {};
    
    // Get all unique products from stock entries
    const allProducts = new Set();
    stockEntries.forEach(entry => {
      if (entry.product) {
        allProducts.add(entry.product.id);
      }
    });
    sales.forEach(sale => {
      sale.items?.forEach(item => {
        if (item.product) {
          allProducts.add(item.product.id);
        }
      });
    });

    // Calculate for each product
    allProducts.forEach(productId => {
      // Find product name
      let productName = 'Unknown';
      const entryWithProduct = stockEntries.find(e => e.product?.id === productId);
      if (entryWithProduct) {
        productName = entryWithProduct.product.name;
      } else {
        sales.forEach(sale => {
          sale.items?.forEach(item => {
            if (item.product?.id === productId) {
              productName = item.product.name;
            }
          });
        });
      }

      // Calculate opening stock
      const opening = openingEntries
        .filter(e => e.product?.id === productId)
        .reduce((sum, e) => sum + parseFloat(e.quantity || 0), 0);

      // Calculate incoming stock
      const incoming = incomingEntries
        .filter(e => e.product?.id === productId)
        .reduce((sum, e) => sum + parseFloat(e.quantity || 0), 0);

      // Calculate total available
      const totalAvailable = opening + incoming;

      // Calculate sold quantity (direct sales of this product)
      let sold = 0;
      sales.forEach(sale => {
        sale.items?.forEach(item => {
          if (item.product?.id === productId) {
            sold += parseFloat(item.quantity || 0);
          }
        });
      });
      // Add byproduct sales deducted from this parent product
      const byproductSold = byproductSaleQtyByProduct[productId] || 0;
      const soldInclByproduct = sold + byproductSold;

      // Wastage: only real wastage (exclude BYPRODUCT_SALE)
      const wastage = wastageEntries
        .filter(e => e.product?.id === productId)
        .reduce((sum, e) => sum + parseFloat(e.quantity || 0), 0);

      const productMeta = products.find(p => p.id === productId);
      const isByproduct = productMeta?.parentProductId != null;
      // Remaining: for byproducts we don't hold stock (consumes from parent), so show —
      const remaining = isByproduct ? null : (totalAvailable - soldInclByproduct - wastage);

      productBreakdown[productId] = {
        name: productName,
        opening,
        incoming,
        totalAvailable,
        sold,
        byproductSold,
        soldInclByproduct,
        wastage,
        remaining,
        isByproduct,
      };
    });

    return {
      stock: {
        opening: { entries: openingEntries.length, quantity: totalOpeningQty },
        incoming: { entries: incomingEntries.length, quantity: totalIncomingQty },
        closing: { entries: closingEntries.length, quantity: totalClosingQty },
        wastage: { entries: wastageEntries.length, quantity: totalWastageQty },
      },
      sales: {
        total: totalSales,
        paid: paidSales.length,
        pending: pendingSales.length,
        totalRevenue,
        pendingRevenue,
        totalQuantity: totalSalesQuantity,
        totalRevenueAll: totalSalesRevenue,
      },
      products: topProducts,
      paymentMethods,
      productBreakdown: Object.values(productBreakdown),
    };
  }, [stockEntries, sales, products]);

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <p className="text-xs text-gray-600 mb-1">Total Sales</p>
          <p className="text-2xl font-bold text-gray-900">{analytics.sales.total}</p>
          <p className="text-xs text-gray-500 mt-1">
            {analytics.sales.paid} paid, {analytics.sales.pending} pending
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
          <p className="text-xs text-gray-600 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">
            KES {analytics.sales.totalRevenue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </p>
          {analytics.sales.pendingRevenue > 0 && (
            <p className="text-xs text-yellow-600 mt-1">
              {analytics.sales.pendingRevenue.toLocaleString('en-KE', { minimumFractionDigits: 2 })} pending
            </p>
          )}
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
          <p className="text-xs text-gray-600 mb-1">Total Quantity Sold</p>
          <p className="text-2xl font-bold text-gray-900">
            {analytics.sales.totalQuantity.toFixed(2)} kg
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
          <p className="text-xs text-gray-600 mb-1">Avg Price per Kg</p>
          <p className="text-2xl font-bold text-gray-900">
            {analytics.sales.totalQuantity > 0 
              ? `KES ${(analytics.sales.totalRevenue / analytics.sales.totalQuantity).toFixed(2)}`
              : 'KES 0.00'}
          </p>
        </div>
      </div>

      {/* Stock Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Stock Summary</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-600">Opening Stock</p>
            <p className="text-lg font-bold text-gray-900">
              {analytics.stock.opening.quantity.toFixed(2)} kg
            </p>
            <p className="text-xs text-gray-500">{analytics.stock.opening.entries} entries</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Incoming Stock</p>
            <p className="text-lg font-bold text-gray-900">
              {analytics.stock.incoming.quantity.toFixed(2)} kg
            </p>
            <p className="text-xs text-gray-500">{analytics.stock.incoming.entries} entries</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Closing Stock</p>
            <p className="text-lg font-bold text-gray-900">
              {analytics.stock.closing.quantity.toFixed(2)} kg
            </p>
            <p className="text-xs text-gray-500">{analytics.stock.closing.entries} entries</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Wastage</p>
            <p className="text-lg font-bold text-red-600">
              {analytics.stock.wastage.quantity.toFixed(2)} kg
            </p>
            <p className="text-xs text-gray-500">{analytics.stock.wastage.entries} entries</p>
          </div>
        </div>
      </div>

      {/* Aggregated Sales Breakdown by Product */}
      {sales.length > 0 && (() => {
        // Aggregate sales by product
        const aggregatedByProduct = {};
        sales.forEach(sale => {
          sale.items?.forEach(item => {
            const productName = item.product?.name || 'N/A';
            if (!aggregatedByProduct[productName]) {
              aggregatedByProduct[productName] = {
                name: productName,
                totalQuantity: 0,
                totalRevenue: 0,
                salesCount: 0,
              };
            }
            aggregatedByProduct[productName].totalQuantity += parseFloat(item.quantity || 0);
            aggregatedByProduct[productName].totalRevenue += parseFloat(item.totalPrice || 0);
            aggregatedByProduct[productName].salesCount += 1;
          });
        });

        const aggregatedProducts = Object.values(aggregatedByProduct)
          .sort((a, b) => b.totalRevenue - a.totalRevenue);

        return (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Sales Breakdown by Product (Aggregated)</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Quantity (kg)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Sales (KES)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sales Count</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg Price/kg</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {aggregatedProducts.map((product, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{product.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {product.totalQuantity.toFixed(2)} kg
                      </td>
                      <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                        KES {product.totalRevenue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{product.salesCount}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        KES {product.totalQuantity > 0 
                          ? (product.totalRevenue / product.totalQuantity).toFixed(2)
                          : '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-4 py-2 text-sm font-semibold text-gray-900 text-right">
                      Total:
                    </td>
                    <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                      {analytics.sales.totalQuantity.toFixed(2)} kg
                    </td>
                    <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                      KES {analytics.sales.totalRevenueAll.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                      {analytics.sales.total}
                    </td>
                    <td className="px-4 py-2 text-sm font-semibold text-gray-900">
                      KES {analytics.sales.totalQuantity > 0 
                        ? (analytics.sales.totalRevenueAll / analytics.sales.totalQuantity).toFixed(2)
                        : '0.00'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Product Breakdown: Quantities Sold and Remaining */}
      {analytics.productBreakdown.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Product Breakdown: Quantities Sold and Remaining</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Opening (kg)</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Incoming (kg)</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Available (kg)</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sold (kg)</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Wastage (kg)</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remaining (kg)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.productBreakdown.map((product, idx) => (
                  <tr key={idx} className={product.remaining != null && product.remaining < 0 ? 'bg-red-50' : product.isByproduct ? 'bg-gray-50/50' : ''}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      {product.name}
                      {product.isByproduct && <span className="ml-1 text-xs text-gray-500">(from parent stock)</span>}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">{product.opening.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{product.incoming.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm font-semibold text-gray-900">{product.totalAvailable.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-gray-600" title={product.byproductSold > 0 ? `Direct: ${product.sold.toFixed(2)}, via byproduct: ${product.byproductSold.toFixed(2)}` : ''}>
                      {product.soldInclByproduct.toFixed(2)}
                      {product.byproductSold > 0 && <span className="ml-1 text-xs text-gray-500">(incl. byproduct)</span>}
                    </td>
                    <td className="px-4 py-2 text-sm text-red-600">{product.wastage.toFixed(2)}</td>
                    <td className={`px-4 py-2 text-sm font-semibold ${product.remaining == null ? 'text-gray-500' : product.remaining < 0 ? 'text-red-600' : product.remaining === 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {product.remaining == null ? '—' : product.remaining.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* Payment Methods */}
      {Object.keys(analytics.paymentMethods).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Payment Methods</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(analytics.paymentMethods).map(([method, stats]) => (
              <div key={method} className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600">{method}</p>
                <p className="text-lg font-bold text-gray-900">{stats.count} sales</p>
                <p className="text-xs text-gray-500">
                  KES {stats.revenue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Sales Table Component
function SalesTable({ sales }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale Number</th>
            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sales.length === 0 ? (
            <tr>
              <td colSpan="6" className="px-4 sm:px-6 py-4 text-center text-gray-500">
                No sales found for this session
              </td>
            </tr>
          ) : (
            sales.map((sale) => (
              <tr key={sale.id} className="hover:bg-gray-50">
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {sale.saleNumber}
                </td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(sale.soldAt).toLocaleString()}
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
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    sale.paymentStatus === 'PAID' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {sale.paymentStatus}
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => window.location.href = `/dashboard/sales/${sale.id}`}
                    className="text-blue-900 hover:text-blue-700 font-medium"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// Stock Entry Form Component
function StockEntryForm({ session, products, suppliers = [], type, onSuccess }) {
  const [formData, setFormData] = useState({
    productId: '',
    supplierId: '',
    quantity: '',
    unit: 'kg',
    notes: '',
    photoUrl: null,
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.productId || !formData.quantity) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSubmitting(true);
      
      let photoUrl = null;
      // Upload photo if provided (required for wastage, optional for closing)
      if (type === 'WASTAGE' && !selectedFile) {
        toast.error("Photo evidence is required for wastage entries");
        setSubmitting(false);
        return;
      }
      if (selectedFile) {
        const uploadRes = await apiClient.uploads.upload(selectedFile);
        // Store the filename (full path) in the database
        photoUrl = uploadRes.data.filename;
      }

      await apiClient.stockEntries.create({
        sessionId: session.id,
        productId: parseInt(formData.productId),
        supplierId: type === 'INCOMING' && formData.supplierId ? parseInt(formData.supplierId) : undefined,
        type: type,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        notes: formData.notes || null,
        photoUrl: photoUrl,
      });
      toast.success(`${type} stock entry recorded successfully`);
      setFormData({ productId: '', supplierId: '', quantity: '', unit: 'kg', notes: '', photoUrl: null });
      setSelectedFile(null);
      setPreviewUrl(null);
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to record stock entry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Product *
        </label>
        <select
          value={formData.productId}
          onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
          required
        >
          <option value="">Select a product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.unit})
            </option>
          ))}
        </select>
      </div>

      {type === 'INCOMING' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supplier *
          </label>
          <select
            value={formData.supplierId}
            onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            required
          >
            <option value="">Select a supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity *
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unit
          </label>
          <input
            type="text"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            placeholder="kg"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
          rows="3"
        />
      </div>

      {type === 'WASTAGE' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Photo Evidence *
          </label>
          <p className="text-xs text-gray-500 mb-2">Wastage entries require photo evidence</p>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
            required
          />
          {previewUrl && (
            <div className="mt-2">
              <img src={previewUrl} alt="Preview" className="max-w-xs max-h-48 rounded-md border border-gray-300" />
            </div>
          )}
        </div>
      )}
      {type === 'CLOSING' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Photo Evidence (Optional)
          </label>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
          />
          {previewUrl && (
            <div className="mt-2">
              <img src={previewUrl} alt="Preview" className="max-w-xs max-h-48 rounded-md border border-gray-300" />
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors disabled:opacity-50 min-h-[44px] text-base"
      >
        {submitting ? 'Recording...' : (() => {
          const typeLabels = {
            'OPENING': 'Record Opening Stock',
            'INCOMING': 'Record Incoming Stock',
            'CLOSING': 'Record Closing Stock',
            'WASTAGE': 'Record Wastage'
          };
          return typeLabels[type] || `Record ${type} Stock`;
        })()}
      </button>
    </form>
  );
}

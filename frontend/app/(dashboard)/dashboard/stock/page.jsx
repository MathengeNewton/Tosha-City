"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";
import { exportToExcel } from "../../../../lib/exportExcel";

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
  
  const [loading, setLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [allSessions, setAllSessions] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [stockEntries, setStockEntries] = useState([]);
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
      
      // Get current session
      const sessionRes = await apiClient.stockSessions.getCurrent();
      const session = sessionRes.data;
      setCurrentSession(session);

      // Get all sessions for list/calendar views
      await loadSessions();

      // Get products
      const productsRes = await apiClient.products.getActive();
      setProducts(productsRes.data || []);

      // Get suppliers
      const suppliersRes = await apiClient.suppliers.getAll({ activeOnly: true });
      setSuppliers(suppliersRes.data || []);

      // Get stock entries if session exists
      const sessionToLoad = sessionIdParam ? selectedSession : session;
      if (sessionToLoad) {
        const entriesRes = await apiClient.stockEntries.getAll({ sessionId: sessionToLoad.id });
        setStockEntries(entriesRes.data || []);
      }

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
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Session Information
            </h3>
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

          <StockOverview 
            session={selectedSession} 
            products={products} 
            stockEntries={stockEntries}
            onRefresh={loadData}
          />
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

      {/* Session Status */}
      {currentSession && (
        <div className={`p-6 rounded-xl shadow-sm border-2 ${
          currentSession.status === 'OPEN' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Current Session: {new Date(currentSession.date).toLocaleDateString()}
              </h3>
              <p className="text-sm text-gray-600">
                Status: <span className={`font-semibold ${
                  currentSession.status === 'OPEN' ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {currentSession.status}
                </span>
              </p>
            </div>
          </div>
        </div>
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

      {/* Current Session Tabs - Only show if current session is open and no sessionId param */}
      {currentSession && currentSession.status === 'OPEN' && !sessionIdParam && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Date range filter - applies to overview table */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    const rows = filteredStockEntries.map((e) => ({
                      product: e.product?.name || "N/A",
                      type: e.type,
                      quantity: e.quantity,
                      unit: e.unit || "kg",
                      date: e.recordedAt ? new Date(e.recordedAt).toLocaleString() : "",
                    }));
                    exportToExcel(
                      rows,
                      [
                        { key: "product", label: "Product" },
                        { key: "type", label: "Type" },
                        { key: "quantity", label: "Quantity" },
                        { key: "unit", label: "Unit" },
                        { key: "date", label: "Date" },
                      ],
                      "stock-entries-export"
                    );
                    toast.success("Excel exported");
                  }}
                  className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 text-sm min-h-[44px] w-full"
                >
                  Export Excel
                </button>
              </div>
            </div>
          </div>
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              {['overview', 'opening', 'incoming', 'wastage', 'closing'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 sm:px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${
                    activeTab === tab
                      ? 'border-blue-900 text-blue-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab === 'wastage' ? 'Wastage' : tab.charAt(0).toUpperCase() + tab.slice(1) + ' Stock'}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <StockOverview 
                session={currentSession} 
                products={products} 
                stockEntries={filteredStockEntries}
                onRefresh={loadData}
              />
            )}
            {activeTab === 'opening' && (
              <StockEntryForm 
                session={currentSession} 
                products={products} 
                type="OPENING"
                onSuccess={loadData}
              />
            )}
            {activeTab === 'incoming' && (
              <StockEntryForm 
                session={currentSession} 
                products={products}
                suppliers={suppliers}
                type="INCOMING"
                onSuccess={loadData}
              />
            )}
            {activeTab === 'wastage' && (
              <StockEntryForm 
                session={currentSession} 
                products={products} 
                type="WASTAGE"
                onSuccess={loadData}
              />
            )}
            {activeTab === 'closing' && (
              <StockEntryForm 
                session={currentSession} 
                products={products} 
                type="CLOSING"
                onSuccess={loadData}
              />
            )}
          </div>
        </div>
      )}

      {!currentSession && !sessionIdParam && (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
          <p className="text-gray-600 mb-4">No active stock session. Open a session to start managing stock.</p>
          <button
            onClick={handleOpenSession}
            className="bg-blue-900 text-white px-6 py-3 rounded-md hover:bg-[#1e88b5] transition-colors min-h-[44px]"
          >
            Open Stock Session
          </button>
        </div>
      )}
    </div>
  );
}

// List View Component
function ListView({ sessions, filters, setFilters, listPage, setListPage, listPageSize, setListPageSize, totalPages, totalSessions, onViewSession, onRefresh }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Filters */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            />
          </div>
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
                    <button
                      onClick={() => onViewSession(session)}
                      className="text-blue-900 hover:text-blue-700 font-medium min-h-[44px] px-3"
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
          
          return (
            <div
              key={idx}
              onClick={() => session && onDayClick(session)}
              className={`min-h-[80px] sm:min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors ${
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
                <div className="text-xs">
                  <div className={`inline-block px-2 py-1 rounded ${
                    session.status === 'OPEN' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-800'
                  }`}>
                    {session.status}
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

// Stock Overview Component
function StockOverview({ session, products, stockEntries, onRefresh }) {
  const openingEntries = stockEntries.filter(e => e.type === 'OPENING');
  const incomingEntries = stockEntries.filter(e => e.type === 'INCOMING');
  const closingEntries = stockEntries.filter(e => e.type === 'CLOSING');
  const wastageEntries = stockEntries.filter(e => e.type === 'WASTAGE');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Opening Stock</p>
          <p className="text-2xl font-bold text-gray-900">{openingEntries.length} entries</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Incoming Stock</p>
          <p className="text-2xl font-bold text-gray-900">{incomingEntries.length} entries</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Closing Stock</p>
          <p className="text-2xl font-bold text-gray-900">{closingEntries.length} entries</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Wastage</p>
          <p className="text-2xl font-bold text-gray-900">{wastageEntries.length} entries</p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Entries</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stockEntries.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 sm:px-6 py-4 text-center text-gray-500">
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
        {submitting ? 'Recording...' : `Record ${type} Stock`}
      </button>
    </form>
  );
}

"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../../lib/api";
import { toast } from "react-toastify";
import Link from "next/link";

export default function CashierDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState(null);
  const [currentSessionSales, setCurrentSessionSales] = useState([]);
  const [stats, setStats] = useState({
    todaySales: 0,
    todayRevenue: 0,
    unpaidSales: 0,
    activeProducts: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get current session
      const sessionRes = await apiClient.stockSessions.getCurrent();
      const session = sessionRes.data;
      
      if (session) {
        // Fetch stats for current session
        const allSessionsRes = await apiClient.stockSessions.getAll({
          dateFrom: new Date(session.date).toISOString().split("T")[0],
          dateTo: new Date(session.date).toISOString().split("T")[0],
        });
        const sessionsWithStats = allSessionsRes.data || [];
        const sessionWithStats = sessionsWithStats.find(s => s.id === session.id);
        setCurrentSession(sessionWithStats || session);
        
        // Get all sales for current session
        const salesRes = await apiClient.sales.getAll({ sessionId: session.id });
        const sales = salesRes.data || [];
        setCurrentSessionSales(sales);
        
        const paidSales = sales.filter(s => s.paymentStatus === 'PAID');
        const unpaidSales = sales.filter(s => s.paymentStatus === 'PENDING');
        
        setStats({
          todaySales: sales.length,
          todayRevenue: paidSales.reduce((sum, s) => sum + parseFloat(s.totalAmount || 0), 0),
          unpaidSales: unpaidSales.length,
          activeProducts: 0, // Will be loaded separately
        });
      } else {
        setCurrentSession(null);
        setCurrentSessionSales([]);
      }

      // Get active products count
      const productsRes = await apiClient.products.getActive();
      const activeProducts = productsRes.data || [];
      setStats(prev => ({ ...prev, activeProducts: activeProducts.length }));

    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = () => {
    router.push('/dashboard/stock');
  };

  if (loading) {
    return (
      <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            ToshaCity Butchery Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's today's overview.</p>
        </div>
        <div className="flex gap-2">
          {!currentSession ? (
            <button
              onClick={handleOpenSession}
              className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors text-sm"
            >
              Open Stock Session
            </button>
          ) : (
            <Link
              href="/dashboard/sales/new"
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              New Sale
            </Link>
          )}
        </div>
      </div>

      {/* Current Open Session Banner */}
      {currentSession && currentSession.status === 'OPEN' && (
        <CurrentSessionBanner 
          session={currentSession} 
          sales={currentSessionSales}
          onViewSession={() => router.push(`/dashboard/stock?sessionId=${currentSession.id}`)}
        />
      )}

      {!currentSession && (
        <div className="bg-yellow-50 border-2 border-yellow-200 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Active Session
              </h3>
              <p className="text-sm text-gray-600">
                Open a stock session to start selling.
              </p>
            </div>
            <button
              onClick={handleOpenSession}
              className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors text-sm"
            >
              Open Session
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today's Sales</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.todaySales}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-7 h-7 text-[#0D47A1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today's Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                KES {stats.todayRevenue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unpaid Sales</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.unpaidSales}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <svg className="w-7 h-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Products</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.activeProducts}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10l-8-4m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/dashboard/stock"
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Stock Management</h3>
          <p className="text-sm text-gray-600">Manage opening stock, incoming stock, and closing stock</p>
        </Link>

        <Link
          href="/dashboard/sales/new"
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-green-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">New Sale</h3>
          <p className="text-sm text-gray-600">Create a new sale and generate receipt</p>
        </Link>

        <Link
          href="/dashboard/sales"
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-purple-500 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-900 mb-2">View Sales</h3>
          <p className="text-sm text-gray-600">View all sales and manage payments</p>
        </Link>
      </div>
    </div>
  );
}

// Current Session Banner Component (reused from stock page)
function CurrentSessionBanner({ session, sales, onViewSession }) {
  // Calculate simple sales statistics
  const salesStats = useMemo(() => {
    const totalSales = sales.length;
    const paidSales = sales.filter(s => s.paymentStatus === 'PAID');
    const totalRevenue = paidSales.reduce((sum, s) => sum + parseFloat(s.totalAmount || 0), 0);
    
    return {
      totalSales,
      totalRevenue,
    };
  }, [sales]);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl shadow-sm border-2 border-blue-200 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Current Open Session: {new Date(session.date).toLocaleDateString()}
          </h3>
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/70 p-3 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-600 mb-1">Opening Stock</p>
              <p className="text-xl font-bold text-gray-900">{session.stats?.openingStockCount || 0}</p>
            </div>
            <div className="bg-white/70 p-3 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-600 mb-1">Incoming Stock</p>
              <p className="text-xl font-bold text-gray-900">{session.stats?.incomingStockCount || 0}</p>
            </div>
            <div className="bg-white/70 p-3 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-600 mb-1">Total Sales</p>
              <p className="text-xl font-bold text-gray-900">{salesStats.totalSales}</p>
            </div>
            <div className="bg-white/70 p-3 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-600 mb-1">Total Revenue</p>
              <p className="text-xl font-bold text-gray-900">
                KES {salesStats.totalRevenue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={onViewSession}
          className="bg-blue-900 text-white px-6 py-3 rounded-md hover:bg-[#1e88b5] transition-colors text-sm font-medium min-h-[44px] whitespace-nowrap w-full sm:w-auto"
        >
          View Stock Session
        </button>
      </div>
    </div>
  );
}
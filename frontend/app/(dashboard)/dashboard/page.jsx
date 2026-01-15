"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../../lib/api";
import { toast } from "react-toastify";
import Link from "next/link";

export default function CashierDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState(null);
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
      setCurrentSession(session);

      if (session) {
        // Get today's sales
        const today = new Date().toISOString().split('T')[0];
        const salesRes = await apiClient.sales.getAll({ sessionId: session.id, date: today });
        const sales = salesRes.data || [];
        
        const paidSales = sales.filter(s => s.paymentStatus === 'PAID');
        const unpaidSales = sales.filter(s => s.paymentStatus === 'PENDING');
        
        setStats({
          todaySales: sales.length,
          todayRevenue: paidSales.reduce((sum, s) => sum + parseFloat(s.totalAmount || 0), 0),
          unpaidSales: unpaidSales.length,
          activeProducts: 0, // Will be loaded separately
        });
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

      {/* Session Status Card */}
      <div className={`p-6 rounded-xl shadow-sm border-2 ${
        currentSession 
          ? currentSession.status === 'OPEN' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-gray-50 border-gray-200'
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Stock Session Status
            </h3>
            {currentSession ? (
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  Date: {new Date(currentSession.sessionDate).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  Status: <span className={`font-semibold ${
                    currentSession.status === 'OPEN' ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {currentSession.status}
                  </span>
                </p>
                {currentSession.status === 'OPEN' && (
                  <p className="text-xs text-gray-500 mt-2">
                    Session opened by: {currentSession.openedBy?.name || 'N/A'}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                No active session. Open a stock session to start selling.
              </p>
            )}
          </div>
          <div className="text-right">
            {currentSession && currentSession.status === 'OPEN' ? (
              <Link
                href="/dashboard/stock"
                className="inline-block bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors text-sm"
              >
                Manage Stock
              </Link>
            ) : (
              <button
                onClick={handleOpenSession}
                className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors text-sm"
              >
                Open Session
              </button>
            )}
          </div>
        </div>
      </div>

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


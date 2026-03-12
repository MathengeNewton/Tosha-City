"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../../lib/api";
import { toast } from "react-toastify";
import Link from "next/link";
import CurrentSessionBanner from "../components/CurrentSessionBanner";
import { useAuth } from "../../../contexts/AuthContext";

export default function CashierDashboard() {
  const router = useRouter();
  const { hasRole, loading: authLoading } = useAuth();
  const isAdmin = hasRole("admin");
  const [loading, setLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState(null);
  const [currentSessionSales, setCurrentSessionSales] = useState([]);
  const [stats, setStats] = useState({
    todaySales: 0,
    todayRevenue: 0,
    unpaidSales: 0,
    activeProducts: 0,
  });
  const [adminOverview, setAdminOverview] = useState({
    branches: [],
    runningBranches: [],
    totalBranches: 0,
    activeBranches: 0,
    runningBranchesCount: 0,
    generalBranches: 0,
    porkBranches: 0,
  });

  useEffect(() => {
    if (authLoading) return;
    loadDashboardData();
  }, [authLoading, isAdmin]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      if (isAdmin) {
        const [branchesRes, openSessionsRes] = await Promise.all([
          apiClient.branches.getAll(),
          apiClient.stockSessions.getAll({ status: "OPEN" }),
        ]);

        const branches = branchesRes.data || [];
        const runningSessions = openSessionsRes.data || [];

        const branchesWithSessionState = branches.map((branch) => ({
          ...branch,
          currentSession: runningSessions.find((session) => session.branchId === branch.id) || null,
        }));

        setAdminOverview({
          branches: branchesWithSessionState,
          runningBranches: runningSessions,
          totalBranches: branches.length,
          activeBranches: branches.filter((branch) => branch.isActive !== false).length,
          runningBranchesCount: runningSessions.length,
          generalBranches: branches.filter((branch) => branch.type === "GENERAL_BUTCHERY").length,
          porkBranches: branches.filter((branch) => branch.type === "PORK_BUTCHERY").length,
        });
      } else {
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
            activeProducts: 0,
          });
        } else {
          setCurrentSession(null);
          setCurrentSessionSales([]);
        }

        const productsRes = await apiClient.products.getActive();
        const activeProducts = productsRes.data || [];
        setStats(prev => ({ ...prev, activeProducts: activeProducts.length }));
      }

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

  if (authLoading || loading) {
    return (
      <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Branch Reporting Overview
            </h1>
            <p className="text-gray-600 mt-1">Monitor active branches, compare operations, and jump into branch management.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/reports"
              className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors text-sm"
            >
              Open Reports
            </Link>
            <Link
              href="/admin/branches"
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors text-sm"
            >
              Manage Branches
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard label="Total Branches" value={adminOverview.totalBranches} color="blue" />
          <StatCard label="Active Branches" value={adminOverview.activeBranches} color="green" />
          <StatCard label="Branches Running Now" value={adminOverview.runningBranchesCount} color="amber" />
          <StatCard label="General / Pork" value={`${adminOverview.generalBranches} / ${adminOverview.porkBranches}`} color="purple" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Branches Actively Running</h2>
                <p className="text-sm text-gray-600 mt-1">Open stock sessions happening right now.</p>
              </div>
              <Link href="/admin/branches" className="text-sm font-medium text-blue-900 hover:text-[#1e88b5]">
                View branches
              </Link>
            </div>

            <div className="space-y-3">
              {adminOverview.runningBranches.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                  No branches have an open stock session right now.
                </div>
              ) : (
                adminOverview.runningBranches.map((session) => (
                  <div key={session.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{session.branch?.name || "Unknown branch"}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {session.branch?.type === "PORK_BUTCHERY" ? "Pork butchery" : "General butchery"}
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Running
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-3">
                      Session date: {session.date ? new Date(session.date).toLocaleDateString() : "Unknown"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Branch Overview</h2>
                <p className="text-sm text-gray-600 mt-1">Quick branch details before you dive into the full branch section.</p>
              </div>
              <Link href="/admin/branches" className="text-sm font-medium text-blue-900 hover:text-[#1e88b5]">
                Go to branches
              </Link>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adminOverview.branches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500">No branches found.</td>
                    </tr>
                  ) : (
                    adminOverview.branches.map((branch) => (
                      <tr key={branch.id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{branch.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{branch.code}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {branch.type === "PORK_BUTCHERY" ? "Pork butchery" : "General butchery"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${branch.isActive !== false ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                            {branch.isActive !== false ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {branch.currentSession ? (
                            <span className="text-green-700 font-medium">Running now</span>
                          ) : (
                            <span className="text-gray-500">No open session</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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

function StatCard({ label, value, color }) {
  const colorClasses = {
    blue: "bg-blue-100 text-[#0D47A1]",
    green: "bg-green-100 text-green-600",
    amber: "bg-yellow-100 text-yellow-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color] || colorClasses.blue}`}>
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M6 11h12M9 15h6M4 19h16M4 5h16" />
          </svg>
        </div>
      </div>
    </div>
  );
}
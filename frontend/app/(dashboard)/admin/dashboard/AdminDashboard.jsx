"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";

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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7h18M6 11h12M9 15h6M4 19h16M4 5h16"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [adminOverview, setAdminOverview] = useState({
    branches: [],
    runningBranches: [],
    totalBranches: 0,
    activeBranches: 0,
    runningBranchesCount: 0,
    generalBranches: 0,
    porkBranches: 0,
    activeProducts: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [branchesRes, openSessionsRes, productsRes] = await Promise.all([
        apiClient.branches.getAll(),
        apiClient.stockSessions.getAll({ status: "OPEN" }),
        apiClient.products.getActive(),
      ]);

      const branches = branchesRes.data || [];
      const runningSessions = openSessionsRes.data || [];
      const activeProducts = productsRes.data || [];

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
        activeProducts: activeProducts.length,
      });
    } catch (error) {
      console.error("Error loading admin dashboard:", error);
      toast.error("Failed to load admin dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">LakeTown Butchery — Admin</h1>
          <p className="text-gray-600 mt-1">
            Branches, stock sessions, and quick links to management tools.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/stock"
            className="bg-slate-700 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm"
          >
            Stock session
          </Link>
          <Link
            href="/dashboard/sales"
            className="bg-emerald-700 text-white px-4 py-2 rounded-md hover:bg-emerald-800 transition-colors text-sm"
          >
            Sales
          </Link>
          <Link
            href="/dashboard/reports"
            className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors text-sm"
          >
            Reports
          </Link>
          <Link
            href="/admin/branches"
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
          >
            Branches
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/admin/products"
          className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-400 shadow-sm transition-all text-sm font-medium text-gray-900"
        >
          Products
        </Link>
        <Link
          href="/admin/recipes"
          className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-400 shadow-sm transition-all text-sm font-medium text-gray-900"
        >
          Recipes
        </Link>
        <Link
          href="/admin/suppliers"
          className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-400 shadow-sm transition-all text-sm font-medium text-gray-900"
        >
          Suppliers
        </Link>
        <Link
          href="/admin/customers"
          className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-400 shadow-sm transition-all text-sm font-medium text-gray-900"
        >
          Customers
        </Link>
        <Link
          href="/admin/partners"
          className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-400 shadow-sm transition-all text-sm font-medium text-gray-900"
        >
          Partners
        </Link>
        <Link
          href="/admin/users"
          className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-400 shadow-sm transition-all text-sm font-medium text-gray-900"
        >
          Users
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard label="Total branches" value={adminOverview.totalBranches} color="blue" />
        <StatCard label="Active branches" value={adminOverview.activeBranches} color="green" />
        <StatCard label="Running sessions now" value={adminOverview.runningBranchesCount} color="amber" />
        <StatCard label="Active products" value={adminOverview.activeProducts} color="purple" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-600">General butchery</p>
          <p className="text-2xl font-bold text-gray-900">{adminOverview.generalBranches}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-600">Pork butchery</p>
          <p className="text-2xl font-bold text-gray-900">{adminOverview.porkBranches}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-600">General / Pork split</p>
          <p className="text-xl font-bold text-gray-900">
            {adminOverview.generalBranches} / {adminOverview.porkBranches}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Sessions running now</h2>
              <p className="text-sm text-gray-600 mt-1">Open stock sessions per branch.</p>
            </div>
            <Link href="/admin/branches" className="text-sm font-medium text-blue-900 hover:text-[#1e88b5]">
              Branches
            </Link>
          </div>

          <div className="space-y-3">
            {adminOverview.runningBranches.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                No open stock sessions right now.
              </div>
            ) : (
              adminOverview.runningBranches.map((session) => (
                <div key={session.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{session.branch?.name || "Branch"}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {session.branch?.type === "PORK_BUTCHERY" ? "Pork butchery" : "General butchery"}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Open
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    Session date:{" "}
                    {session.date ? new Date(session.date).toLocaleDateString() : "—"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">All branches</h2>
              <p className="text-sm text-gray-600 mt-1">Status and whether a session is open.</p>
            </div>
            <Link href="/admin/branches" className="text-sm font-medium text-blue-900 hover:text-[#1e88b5]">
              Manage branches
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
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      No branches yet. Create one under Branches.
                    </td>
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
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            branch.isActive !== false ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {branch.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {branch.currentSession ? (
                          <span className="text-green-700 font-medium">Running</span>
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

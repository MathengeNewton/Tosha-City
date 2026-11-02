"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { apiClient } from "../../../../lib/api";
import { useAuth } from "../../../../contexts/AuthContext";
import { exportToExcel } from "../../../../lib/exportExcel";
import { defaultDateRangeYmd, formatDate, formatDateTime } from "../../../../lib/time";
import {
  EXPENSE_CATEGORIES,
  expenseCategoryLabel,
  expensePaymentLabel,
  formatKes,
  sumExpenses,
} from "../../../../lib/expenses";
import { PageShell, PageHeader, PageLoading } from "../../components/shell";
import ExpensesTab from "../components/ExpensesTab";

const defaultFilters = () => {
  const { dateFrom, dateTo } = defaultDateRangeYmd(7);
  return { startDate: dateFrom, endDate: dateTo, category: "" };
};

const inputClass =
  "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function ExpensesPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const canManage = isAdmin || hasRole("cashier");

  const [loadingSession, setLoadingSession] = useState(true);
  const [currentSession, setCurrentSession] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.stockSessions.getCurrent();
        setCurrentSession(res.data || null);
      } catch {
        setCurrentSession(null);
      } finally {
        setLoadingSession(false);
      }
    })();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await apiClient.expenses.getAll({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        category: filters.category || undefined,
      });
      setHistory(res.data || []);
    } catch {
      toast.error("Failed to load expense history");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const byCategory = useMemo(() => {
    const totals = {};
    history.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + parseFloat(e.amount || 0);
    });
    return Object.entries(totals).sort(([, a], [, b]) => b - a);
  }, [history]);

  const handleExport = () => {
    if (history.length === 0) {
      toast.info("No expenses to export for these filters");
      return;
    }
    const rows = history.map((e) => ({
      date: e.session?.date ? formatDate(e.session.date) : "",
      recordedAt: formatDateTime(e.recordedAt),
      category: expenseCategoryLabel(e.category),
      description: e.description,
      paidFrom: expensePaymentLabel(e.paymentMethod),
      amount: parseFloat(e.amount || 0),
      recordedBy: e.recordedBy?.username || "",
    }));
    exportToExcel(
      rows,
      [
        { key: "date", label: "Session date" },
        { key: "recordedAt", label: "Recorded at" },
        { key: "category", label: "Category" },
        { key: "description", label: "Description" },
        { key: "paidFrom", label: "Paid from" },
        { key: "amount", label: "Amount (KES)" },
        { key: "recordedBy", label: "Recorded by" },
      ],
      `expenses-${filters.startDate}-to-${filters.endDate}`,
    );
    toast.success("Excel exported");
  };

  if (loadingSession) return <PageLoading />;

  const total = sumExpenses(history);

  return (
    <PageShell>
      <PageHeader title="Expenses" subtitle="Record money paid out each day and review spending over time." />

      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Today&apos;s session</h2>
          {currentSession && (
            <p className="text-sm text-gray-500">
              {formatDate(currentSession.date)} · {currentSession.status === "OPEN" ? "Open" : "Closed"}
            </p>
          )}
        </div>
        {currentSession ? (
          <ExpensesTab
            session={currentSession}
            canManage={canManage}
            isAdmin={isAdmin}
            onChange={loadHistory}
          />
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            There is no open stock session. Open today&apos;s session under{" "}
            <Link href="/dashboard/stock" className="font-semibold underline">
              Stock Session
            </Link>{" "}
            to start recording expenses.
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Expense history</h2>
          <p className="text-sm text-gray-600">All expenses across sessions, filtered by session date.</p>
        </div>

        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="min-w-[140px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="min-w-[140px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className={inputClass}
              >
                <option value="">All categories</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setFilters(defaultFilters())}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 text-sm font-medium"
            >
              Clear filters
            </button>
            <div className="ml-auto">
              <button
                type="button"
                onClick={handleExport}
                className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 text-sm font-medium min-h-[44px]"
              >
                Export Excel
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-600">Total for period</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatKes(total)}</p>
              <p className="text-xs text-gray-500">{history.length} entries</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-600">Paid from till (cash)</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatKes(sumExpenses(history, "CASH"))}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-600">Paid via M-Pesa</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatKes(sumExpenses(history, "MPESA"))}</p>
            </div>
          </div>

          {byCategory.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">By category</h3>
              <div className="space-y-2">
                {byCategory.map(([category, amount]) => (
                  <div key={category} className="flex items-center gap-3">
                    <span className="w-44 shrink-0 text-sm text-gray-700">{expenseCategoryLabel(category)}</span>
                    <div className="h-2 flex-1 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-[#0D47A1]"
                        style={{ width: `${total > 0 ? (amount / total) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-32 shrink-0 text-right text-sm font-medium tabular-nums text-gray-900">
                      {formatKes(amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Session date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Paid from</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Recorded by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loadingHistory ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">Loading…</td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                      No expenses in this period. Try a wider date range.
                    </td>
                  </tr>
                ) : (
                  history.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50/80">
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <Link
                          href={`/dashboard/stock?sessionId=${e.sessionId}&view=list`}
                          className="font-medium text-blue-900 hover:underline"
                        >
                          {e.session?.date ? formatDate(e.session.date) : `Session ${e.sessionId}`}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{expenseCategoryLabel(e.category)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{e.description}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{expensePaymentLabel(e.paymentMethod)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold tabular-nums text-gray-900">
                        {formatKes(e.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{e.recordedBy?.username || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

"use client";
import { useState, useEffect } from "react";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";

const PAGE_SIZE = 50;
const defaultEnd = new Date();
const defaultStart = new Date();
defaultStart.setDate(defaultStart.getDate() - 7);

const ACTION_LABELS = {
  SESSION_OPENED: "Session opened",
  SESSION_CLOSED: "Session closed",
  SESSION_UPDATED: "Session updated",
  SESSION_DELETED: "Session deleted",
  STOCK_ENTRY_CREATED: "Stock entry added",
  STOCK_ENTRY_UPDATED: "Stock entry updated",
  STOCK_ENTRY_DELETED: "Stock entry deleted",
  SALE_CREATED: "Sale created",
  SALE_UPDATED: "Sale updated",
  SALE_DELETED: "Sale deleted",
};

const ENTITY_LABELS = {
  stock_session: "Stock session",
  stock_entry: "Stock entry",
  sale: "Sale",
};

export default function ActivityLogPage() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState({ items: [], total: 0 });
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    dateFrom: defaultStart.toISOString().split("T")[0],
    dateTo: defaultEnd.toISOString().split("T")[0],
    userId: "",
    entityType: "",
    success: "",
    offset: 0,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [filters.dateFrom, filters.dateTo, filters.userId, filters.entityType, filters.success, filters.offset]);

  const loadUsers = async () => {
    try {
      const res = await apiClient.users.getAll();
      setUsers(res.data || []);
    } catch {
      setUsers([]);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = {
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        userId: filters.userId ? parseInt(filters.userId, 10) : undefined,
        entityType: filters.entityType || undefined,
        success: filters.success === "true" ? true : filters.success === "false" ? false : undefined,
        limit: PAGE_SIZE,
        offset: filters.offset,
      };
      const res = await apiClient.activityLog.getAll(params);
      setResult(res.data || { items: [], total: 0 });
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load activity log");
      setResult({ items: [], total: 0 });
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(result.total / PAGE_SIZE) || 1;
  const currentPage = Math.floor(filters.offset / PAGE_SIZE) + 1;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Activity log</h1>
      <p className="text-gray-600 mb-6">
        View everyone&apos;s activity on the system — stock sessions, entries, and sales (success and failures).
      </p>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value, offset: 0 })}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value, offset: 0 })}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">User</label>
            <select
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value, offset: 0 })}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm min-w-[140px]"
            >
              <option value="">All users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.username || u.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Entity</label>
            <select
              value={filters.entityType}
              onChange={(e) => setFilters({ ...filters, entityType: e.target.value, offset: 0 })}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"
            >
              <option value="">All</option>
              <option value="stock_session">Stock session</option>
              <option value="stock_entry">Stock entry</option>
              <option value="sale">Sale</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={filters.success}
              onChange={(e) => setFilters({ ...filters, success: e.target.value, offset: 0 })}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"
            >
              <option value="">All</option>
              <option value="true">Success</option>
              <option value="false">Failed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Details / Error</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {result.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                        No activity in this period.
                      </td>
                    </tr>
                  ) : (
                    result.items.map((log) => (
                      <tr key={log.id} className={log.success ? "" : "bg-red-50/50"}>
                        <td className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {log.user?.username || log.user?.email || "—"}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {ACTION_LABELS[log.action] || log.action}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {ENTITY_LABELS[log.entityType] || log.entityType}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {log.entityId ?? "—"}
                        </td>
                        <td className="px-4 py-2">
                          {log.success ? (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800">Success</span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800">Failed</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate" title={log.errorMessage || (log.details ? JSON.stringify(log.details) : "")}>
                          {log.success
                            ? (log.details && typeof log.details === "object"
                              ? Object.entries(log.details)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(", ")
                              : "")
                            : log.errorMessage || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {result.total > PAGE_SIZE && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Showing {filters.offset + 1}–{Math.min(filters.offset + PAGE_SIZE, result.total)} of {result.total}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFilters({ ...filters, offset: Math.max(0, filters.offset - PAGE_SIZE) })}
                    disabled={filters.offset === 0}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-2 py-1 text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFilters({ ...filters, offset: filters.offset + PAGE_SIZE })}
                    disabled={filters.offset + PAGE_SIZE >= result.total}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

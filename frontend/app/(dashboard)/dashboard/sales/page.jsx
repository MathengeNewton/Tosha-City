"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";
import { exportToExcel } from "../../../../lib/exportExcel";
import { useAuth } from "../../../../contexts/AuthContext";
import { PageShell, PageHeader, PageLoading } from "../../components/shell";
import { formatKes } from "./saleLines";

const FILTERS_KEY = "laketown-sales-filters";

function nairobiToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
}

function todayFilters() {
  const today = nairobiToday();
  return { productId: "", dateFrom: today, dateTo: today };
}

/** URL first, then what the user picked earlier today, otherwise today's sales. */
function initialFilters(searchParams) {
  if (searchParams.has("from") || searchParams.has("to") || searchParams.has("product") || searchParams.has("all")) {
    return {
      productId: searchParams.get("product") || "",
      dateFrom: searchParams.get("from") || "",
      dateTo: searchParams.get("to") || "",
    };
  }
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(FILTERS_KEY) || "null");
    if (saved?.savedOn === nairobiToday() && saved.filters) return saved.filters;
  } catch {
    // ignore unreadable storage
  }
  return todayFilters();
}

export default function SalesListPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <PageLoading message="Loading sales…" />
        </PageShell>
      }
    >
      <SalesList />
    </Suspense>
  );
}

function SalesList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hasRole, loading: authLoading } = useAuth();
  const isAdmin = hasRole("admin");
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    setFilters(isAdmin ? initialFilters(searchParams) : todayFilters());
  }, [authLoading, isAdmin]);

  useEffect(() => {
    if (!filters) return;
    loadData();
    if (!isAdmin) return;
    const params = new URLSearchParams();
    if (filters.productId) params.set("product", filters.productId);
    if (filters.dateFrom) params.set("from", filters.dateFrom);
    if (filters.dateTo) params.set("to", filters.dateTo);
    if (!filters.productId && !filters.dateFrom && !filters.dateTo) params.set("all", "1");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    try {
      window.sessionStorage.setItem(FILTERS_KEY, JSON.stringify({ savedOn: nairobiToday(), filters }));
    } catch {
      // ignore unavailable storage
    }
  }, [filters]);

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    apiClient.products.getAll().then((res) => setProducts(res.data || [])).catch(() => {});
  }, [authLoading, isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);

      const params = {};
      if (filters.productId) params.productId = filters.productId;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;

      const salesRes = await apiClient.sales.getAll(params);
      const list = Array.isArray(salesRes?.data) ? salesRes.data : (salesRes?.data ? [salesRes.data] : []);
      setSales(list);

    } catch (error) {
      console.error("Error loading sales:", error);
      toast.error("Failed to load sales");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !filters) {
    return (
      <PageShell>
        <PageLoading message="Loading sales…" />
      </PageShell>
    );
  }

  const today = nairobiToday();
  const showingToday = !filters.productId && filters.dateFrom === today && filters.dateTo === today;
  const showingAll = !filters.productId && !filters.dateFrom && !filters.dateTo;
  const salesTotal = sales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount || 0), 0);
  const countAndTotal = `${sales.length} sale${sales.length === 1 ? "" : "s"} · KES ${formatKes(salesTotal)}`;

  return (
    <PageShell className="space-y-4 sm:space-y-8">
      <PageHeader title="Sales" subtitle={isAdmin ? "View and manage all sales" : "Today's sales"}>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              const rows = sales.map((s) => ({
                saleNumber: s.saleNumber,
                date: s.soldAt ? new Date(s.soldAt).toLocaleString() : "",
                itemsCount: s.items?.length ?? 0,
                totalAmount: parseFloat(s.totalAmount || 0),
                paymentMethod: s.paymentMethod || "",
                paymentStatus: s.paymentStatus,
              }));
              const dateStr = new Date().toISOString().split("T")[0];
              exportToExcel(
                rows,
                [
                  { key: "saleNumber", label: "Sale #" },
                  { key: "date", label: "Date" },
                  { key: "itemsCount", label: "Items" },
                  { key: "totalAmount", label: "Total (KES)" },
                  { key: "paymentMethod", label: "Payment method" },
                  { key: "paymentStatus", label: "Payment status" },
                ],
                `sales-export-${dateStr}`
              );
              toast.success("Excel exported");
            }}
            className="flex-1 sm:flex-none bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium min-h-[44px]"
          >
            Export Excel
          </button>
          <Link
            href="/dashboard/sales/new"
            className="flex-1 sm:flex-none bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm text-center min-h-[44px] flex items-center justify-center"
          >
            New Sale
          </Link>
        </div>
      </PageHeader>

      {!isAdmin ? (
        <p className="text-sm text-gray-500">Today · {countAndTotal}</p>
      ) : (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product
            </label>
            <select
              value={filters.productId}
              onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
            >
              <option value="">All products</option>
              {(products || []).filter((p) => p.isActive !== false).map((p) => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
            />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
            />
          </div>
          <button
            type="button"
            onClick={() => setFilters(todayFilters())}
            className={`px-4 py-2 border rounded-md text-sm font-medium min-h-[44px] ${
              showingToday
                ? "border-blue-900 bg-blue-900 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setFilters({ productId: "", dateFrom: "", dateTo: "" })}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 text-sm font-medium min-h-[44px]"
          >
            All dates
          </button>
          <p className="text-sm text-gray-500 self-center">
            {showingToday ? "Showing today's sales" : showingAll ? "Showing all sales" : "Filtered"}
            {` · ${countAndTotal}`}
          </p>
        </div>
      </div>
      )}

      {sales.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-16 text-center text-gray-500">
          {showingToday || !isAdmin ? "No sales today yet" : "No sales for these filters"}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sales.map((sale) => {
            const names = (sale.items || []).map((item) => item.product?.name).filter(Boolean);
            const summary = names.length ? names.join(", ") : "No items";
            return (
              <Link
                key={sale.id}
                href={`/dashboard/sales/${sale.id}`}
                className="flex min-h-[140px] flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-gray-900">{sale.saleNumber}</p>
                  <p className="text-lg font-bold tabular-nums text-gray-900">
                    {formatKes(sale.totalAmount)}
                  </p>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {sale.soldAt ? new Date(sale.soldAt).toLocaleString() : ""}
                </p>
                <p className="mt-3 line-clamp-2 flex-1 text-sm font-medium text-gray-800">{summary}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {sale.paymentMethod || ""}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      sale.paymentStatus === "PAID" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {sale.paymentStatus === "PAID" ? "Paid" : "Unpaid"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}


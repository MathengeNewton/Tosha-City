"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../../../../contexts/AuthContext";
import ProductionTab from "../components/ProductionTab";
import { PageShell, PageHeader } from "../../components/shell";

/**
 * Shortcut to morning production against the **current open** session for a pork branch.
 * Primary UI: Stock Session → open a session → **Production** tab (session details).
 */
export default function MorningProductionPage() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const canManage = isAdmin || hasRole("cashier");
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [session, setSession] = useState(null);
  const [productionRuns, setProductionRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  const effectiveBranchId = isAdmin ? selectedBranchId : user?.branchId ? String(user.branchId) : "";

  const load = useCallback(async () => {
    if (!effectiveBranchId) {
      setSession(null);
      setProductionRuns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const sessionRes = await apiClient.stockSessions.getCurrent({ branchId: effectiveBranchId });
      const s = sessionRes.data;
      setSession(s);
      if (s?.id) {
        const pr = await apiClient.production.getAll({ sessionId: s.id });
        setProductionRuns(pr.data || []);
      } else {
        setProductionRuns([]);
      }
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to load production data");
      setSession(null);
      setProductionRuns([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveBranchId]);

  useEffect(() => {
    (async () => {
      if (isAdmin) {
        const res = await apiClient.branches.getAll({ activeOnly: true });
        const pork = (res.data || []).filter((b) => b.type === "PORK_BUTCHERY");
        setBranches(pork);
        if (pork.length && !selectedBranchId) setSelectedBranchId(String(pork[0].id));
      } else if (user?.branchId) {
        setSelectedBranchId(String(user.branchId));
      }
    })();
  }, [isAdmin, user?.branchId, selectedBranchId]);

  useEffect(() => {
    load();
  }, [load]);

  const allowed =
    isAdmin && branches.length > 0 ? true : user?.branch?.type === "PORK_BUTCHERY";

  if (!allowed && !isAdmin) {
    return (
      <PageShell>
        <div className="max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-gray-600">Morning production is set up for pork butchery branches.</p>
          <Link
            href={isAdmin ? "/admin/dashboard" : "/dashboard"}
            className="text-blue-900 hover:text-[#1e88b5] underline mt-3 inline-block font-medium"
          >
            Back to dashboard
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-4xl space-y-6 pb-24">
      <PageHeader
        title="Morning production"
        subtitle="Log each precook batch for today's open session. Saving moves stock automatically — details below."
      />

      {isAdmin && branches.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <label className="text-sm font-medium text-gray-700">Pork branch</label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="min-h-[44px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/30"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center text-sm text-gray-500">
          Loading session…
        </div>
      )}

      {!loading && !session?.id && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 shadow-sm">
          <p className="font-medium">No open stock session for this branch</p>
          <p className="mt-1">
            Open a session on{" "}
            <Link href="/dashboard/stock" className="font-semibold text-blue-900 underline hover:text-[#1e88b5]">
              Stock session
            </Link>
            , then add opening / incoming stock before logging production.
          </p>
        </div>
      )}

      {!loading && session?.id && (
        <>
          <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Active session</p>
              <p className="mt-0.5 text-sm font-semibold text-gray-900">
                #{session.id}
                {session.date ? ` · ${new Date(session.date).toLocaleDateString()}` : ""}
                {session.branch?.name ? ` · ${session.branch.name}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                  session.status === "OPEN"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {session.status === "OPEN" ? "Open" : session.status || "—"}
              </span>
              <Link
                href={`/dashboard/stock?sessionId=${session.id}&tab=production`}
                className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100"
              >
                Open full session
              </Link>
            </div>
          </div>
          <ProductionTab
            session={session}
            canManage={canManage}
            productionRuns={productionRuns}
            onRefresh={load}
            variant="page"
          />
        </>
      )}
    </PageShell>
  );
}

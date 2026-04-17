"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../../../../contexts/AuthContext";
import ProductionTab from "../components/ProductionTab";

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
      <div className="p-6 max-w-lg">
        <p className="text-gray-600">Morning production is set up for pork butchery branches.</p>
        <Link
          href={isAdmin ? "/admin/dashboard" : "/dashboard"}
          className="text-blue-700 underline mt-3 inline-block"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-3 sm:p-4 space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Morning production</h1>
        <p className="text-gray-600 text-sm mt-1">
          After opening the day&apos;s session and recording incoming stock, log every batch you precook for service
          (roasts, chips, soups, etc.) — one run per recipe. This updates prepared-item stock for the kitchen and
          tills.
        </p>
      </div>

      {isAdmin && branches.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-700">Pork branch</label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm min-h-[44px]"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && <p className="text-gray-500">Loading…</p>}

      {!loading && !session?.id && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm">
          No open stock session for this branch. Open a session on{" "}
          <Link href="/dashboard/stock" className="font-medium underline">
            Stock Session
          </Link>{" "}
          first, then capture opening / incoming stock before production runs.
        </div>
      )}

      {!loading && session?.id && (
        <>
          <p className="text-sm text-gray-500">
            Session #{session.id} · {session.date ? new Date(session.date).toLocaleDateString() : ""}
            {" · "}
            <Link
              href={`/dashboard/stock?sessionId=${session.id}&tab=production`}
              className="text-blue-700 underline font-medium"
            >
              Open in Stock Session (Production tab)
            </Link>
          </p>
          <ProductionTab
            session={session}
            canManage={canManage}
            productionRuns={productionRuns}
            onRefresh={load}
          />
        </>
      )}
    </div>
  );
}

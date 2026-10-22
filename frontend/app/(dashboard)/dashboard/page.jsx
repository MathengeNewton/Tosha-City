"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, isKitchenOnlyAccount } from "../../../contexts/AuthContext";
import { PageShell, PageLoading } from "../components/shell";

/** Branch staff open straight onto the till. Admins go to the admin home. */
export default function CashierDashboard() {
  const router = useRouter();
  const { user, hasRole, loading: authLoading } = useAuth();
  const isAdmin = hasRole("admin");
  const kitchenOnly = isKitchenOnlyAccount(user);

  useEffect(() => {
    if (authLoading || kitchenOnly) return;
    router.replace(isAdmin ? "/admin/dashboard" : "/dashboard/sales/new");
  }, [authLoading, isAdmin, kitchenOnly, router]);

  return (
    <PageShell>
      <PageLoading message="Opening the till…" />
    </PageShell>
  );
}

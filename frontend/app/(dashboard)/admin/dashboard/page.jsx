"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy route — operational home is the butchery dashboard at /dashboard */
export default function AdminDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="w-full lg:p-2 min-h-[40vh] flex items-center justify-center text-gray-600">
      Redirecting to dashboard…
    </div>
  );
}

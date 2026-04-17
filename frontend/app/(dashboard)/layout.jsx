"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useAuth } from "../../contexts/AuthContext";

import SideBar from "./SideBar";
import DashBoardHeader from "./DashboardHeader";
import DashboardFooter from "./DashboardFooter";
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
  CubeIcon,
  TruckIcon,
  UserIcon,
  UserGroupIcon,
  CogIcon,
  Bars3Icon,
  XMarkIcon,
  DocumentTextIcon,
  ShareIcon,
  FireIcon,
  PlusCircleIcon,
  BuildingOffice2Icon,
  BookOpenIcon,
  CpuChipIcon,
} from "@heroicons/react/24/outline";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasRole, loading, user } = useAuth();
  const isAdmin = hasRole("admin");
  // Restaurant / kitchen nav only for cashiers on a pork branch — not for admins
  const showRestaurant = !isAdmin && user?.branch?.type === "PORK_BUTCHERY";
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Cashier menu - operational access plus setup masters
  const restaurantItems = showRestaurant
    ? [
        { name: "Table orders", href: "/dashboard/table-orders", icon: ClipboardDocumentListIcon },
        { name: "Kitchen", href: "/dashboard/kitchen", icon: FireIcon },
        { name: "New table order", href: "/dashboard/restaurant-orders/new", icon: PlusCircleIcon },
      ]
    : [];

  const cashierMenu = [
    { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
    { name: "Stock Session", href: "/dashboard/stock", icon: ClipboardDocumentListIcon },
    ...restaurantItems,
    { name: "Production", href: "/dashboard/production", icon: CpuChipIcon },
    { name: "New Sale", href: "/dashboard/sales/new", icon: CreditCardIcon },
    { name: "Sales", href: "/dashboard/sales", icon: ChartBarIcon },
  ];

  const adminMenu = [
    { name: "Admin home", href: "/admin/dashboard", icon: HomeIcon },
    { name: "Stock Session", href: "/dashboard/stock", icon: ClipboardDocumentListIcon },
    { name: "Sales", href: "/dashboard/sales", icon: ChartBarIcon },
    { name: "New Sale", href: "/dashboard/sales/new", icon: CreditCardIcon },
    { name: "Reports", href: "/dashboard/reports", icon: DocumentChartBarIcon },
    { name: "Activity log", href: "/admin/activity-log", icon: DocumentTextIcon },
    { name: "Products", href: "/admin/products", icon: CubeIcon },
    { name: "Recipes", href: "/admin/recipes", icon: BookOpenIcon },
    { name: "Suppliers", href: "/admin/suppliers", icon: TruckIcon },
    { name: "Customers", href: "/admin/customers", icon: UserIcon },
    { name: "Partners", href: "/admin/partners", icon: ShareIcon },
    { name: "Branches", href: "/admin/branches", icon: BuildingOffice2Icon },
    { name: "Users", href: "/admin/users", icon: UserGroupIcon },
    { name: "Settings", href: "/admin/settings", icon: CogIcon },
  ];

  const menuItems = isAdmin ? adminMenu : cashierMenu;
  const cashierAllowedAdminPaths = ["/admin/settings"];
  const isCashierAllowedPath =
    pathname && cashierAllowedAdminPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (loading) return;

    if (isAdmin === false && pathname) {
      if (pathname === "/dashboard/reports") {
        router.replace("/dashboard");
      } else if (pathname.startsWith("/admin") && !isCashierAllowedPath) {
        router.replace("/dashboard");
      }
    }
  }, [isAdmin, loading, pathname, router, isCashierAllowedPath]);

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-gray-100 relative">
        <SideBar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          pathname={pathname}
          menuItems={menuItems}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <DashBoardHeader />
          <main className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6 bg-white/50">
            {children}
          </main>
          <DashboardFooter />
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </div>

        {/* Mobile Backdrop */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        {/* Mobile Toggle Button */}
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="cursor-pointer md:hidden fixed bottom-4 right-4 z-50 bg-blue-900 hover:bg-[#1e88b5] text-white p-3 rounded-full shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-900 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Toggle menu"
        >
          {isMobileOpen ? (
            <XMarkIcon className="h-6 w-6" />
          ) : (
            <Bars3Icon className="h-6 w-6" />
          )}
        </button>
      </div>
    </ProtectedRoute>
  );
}

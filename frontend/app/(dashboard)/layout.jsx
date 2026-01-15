"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ProtectedRoute from "../../components/ProtectedRoute";

import SideBar from "./SideBar";
import DashBoardHeader from "./DashboardHeader";
import DashboardFooter from "./DashboardFooter";
import {
  BellIcon,
  BriefcaseIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  PencilSquareIcon,
  HomeIcon,
  UserIcon,
  CogIcon,
  Bars3Icon,
  XMarkIcon,
  FolderOpenIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
  EnvelopeIcon,
  CreditCardIcon,
  LifebuoyIcon,
} from "@heroicons/react/24/outline";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Cashier menu - Butchery Operations
  const cashierMenu = [
    { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
    { name: "Stock Session", href: "/dashboard/stock", icon: ClipboardDocumentListIcon },
    { name: "New Sale", href: "/dashboard/sales/new", icon: CreditCardIcon },
    { name: "Sales", href: "/dashboard/sales", icon: ChartBarIcon },
  ];

  // Admin menu - Butchery Admin
  const adminMenu = [
    { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
    { name: "Stock Session", href: "/dashboard/stock", icon: ClipboardDocumentListIcon },
    { name: "New Sale", href: "/dashboard/sales/new", icon: CreditCardIcon },
    { name: "Sales", href: "/dashboard/sales", icon: ChartBarIcon },
    { name: "Reports", href: "/dashboard/reports", icon: ChartBarIcon },
    { name: "Products", href: "/admin/products", icon: BriefcaseIcon },
    { name: "Suppliers", href: "/admin/suppliers", icon: BriefcaseIcon },
    { name: "Customers", href: "/admin/customers", icon: UserIcon },
    { name: "Users", href: "/admin/users", icon: UserIcon },
    { name: "Settings", href: "/admin/settings", icon: CogIcon },
  ];

  // Determine menu based on user role (for now, use adminMenu)
  // TODO: Get user role from context and show appropriate menu
  const menuItems = adminMenu;

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
          <main className="flex-1 overflow-y-auto p-6 bg-white/50">
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
          className="cursor-pointer md:hidden fixed bottom-4 right-4 z-50 bg-blue-900 hover:bg-[#1e88b5] text-white p-3 rounded-full shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-900"
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

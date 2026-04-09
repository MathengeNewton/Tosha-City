// SideBar.jsx
import { Bars3Icon } from "@heroicons/react/24/outline";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import Link from "next/link";

export default function SideBar({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  pathname,

  menuItems,
}) {
  const showText = !isCollapsed || isMobileOpen;
  const isMobile = isMobileOpen;

  return (
    <aside
      className={`
        ${
          isMobile ? "fixed md:static inset-y-0 left-0 z-70" : "md:block hidden"
        }
        bg-white border-r border-gray-200 flex flex-col
        transition-all duration-300 ease-in-out
        ${
          isMobile
            ? isMobileOpen
              ? "translate-x-0"
              : "-translate-x-full"
            : "translate-x-0"
        }
        ${isMobile ? "w-48" : isCollapsed ? "w-20" : "w-48"}
      `}
    >
      {/* Sidebar Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-200">
        {showText && (
          <div>
            <Link href={"/"}>
              <span className="text-xl lg:text-2xl font-bold text-blue-900">
                LakeTown
              </span>
            </Link>
          </div>
        )}

        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="cursor-pointer p-2 rounded-lg bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-900 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? (
              <Bars3Icon className="h-6 w-6 text-gray-600" />
            ) : (
              <ChevronLeftIcon className="h-6 w-6 text-gray-600" />
            )}
          </button>
        )}
        {/* Mobile Close - only show on mobile when open */}
        {isMobile && isMobileOpen && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="cursor-pointer p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-900 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close menu"
          >
            <ChevronLeftIcon className="h-6 w-6 text-gray-600" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-4 overflow-y-auto">
        <ul>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  onClick={() => setIsMobileOpen(false)}
                  href={item.href}
                  className={`text-sm lg:text-base flex items-center p-4 transition-colors duration-200 min-h-[44px] ${
                    isActive
                      ? `bg-[#0D47A1]/10 text-[#0D47A1] font-semibold`
                      : "text-gray-600 hover:bg-gray-100 active:bg-gray-200"
                  }`}
                >
                  <item.icon className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                  {showText && <span className="ml-4">{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRightStartOnRectangleIcon,
  ChartBarIcon,
  CreditCardIcon,
  EllipsisHorizontalIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../contexts/AuthContext";

const PRIMARY = [
  { name: "Sell", href: "/dashboard/sales/new", icon: CreditCardIcon },
  { name: "Sales", href: "/dashboard/sales", icon: ChartBarIcon },
  { name: "Me", href: "/admin/settings", icon: UserIcon },
];

function isActive(pathname, href) {
  if (!pathname) return false;
  if (href === "/dashboard/sales/new") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href === "/dashboard/sales") {
    return (
      pathname === href ||
      (pathname.startsWith("/dashboard/sales/") && !pathname.startsWith("/dashboard/sales/new"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function CashierStatusBar() {
  const { user } = useAuth();
  const branch = user?.branch?.name || "No branch";
  const name = user?.username || "Cashier";

  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
      <p className="truncate text-sm font-semibold text-gray-900">{branch}</p>
      <p className="truncate pl-3 text-sm text-gray-500">{name}</p>
    </div>
  );
}

export default function CashierRail({ pathname, moreItems = [] }) {
  const { logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);
  const moreActive = moreItems.some((item) => isActive(pathname, item.href));

  useEffect(() => {
    if (!moreOpen) return undefined;
    const onPointer = (event) => {
      if (moreRef.current && !moreRef.current.contains(event.target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [moreOpen]);

  return (
    <aside className="relative z-30 flex w-[76px] shrink-0 flex-col border-r border-gray-200 bg-white">
      <Link
        href="/dashboard/sales/new"
        className="flex h-14 items-center justify-center border-b border-gray-200 text-lg font-black tracking-tight text-blue-900"
        aria-label="LakeTown till"
      >
        LT
      </Link>

      <nav className="flex flex-1 flex-col gap-1 px-1.5 py-2" aria-label="Till">
        {PRIMARY.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors ${
                active ? "bg-blue-900 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className="h-6 w-6" />
              {item.name}
            </Link>
          );
        })}

        {moreItems.length > 0 && (
          <div className="relative mt-auto" ref={moreRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              aria-expanded={moreOpen}
              className={`flex min-h-[64px] w-full flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors ${
                moreOpen || moreActive ? "bg-blue-900 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <EllipsisHorizontalIcon className="h-6 w-6" />
              More
            </button>
            {moreOpen && (
              <div className="absolute bottom-0 left-full z-50 ml-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
                {moreItems.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex min-h-[48px] items-center gap-3 px-3 text-sm font-medium ${
                        active ? "bg-blue-50 text-blue-900" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      <div className="border-t border-gray-200 p-1.5">
        <button
          type="button"
          onClick={logout}
          className="flex min-h-[64px] w-full flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-gray-600 hover:bg-red-50 hover:text-red-700"
        >
          <ArrowRightStartOnRectangleIcon className="h-6 w-6" />
          Out
        </button>
      </div>
    </aside>
  );
}

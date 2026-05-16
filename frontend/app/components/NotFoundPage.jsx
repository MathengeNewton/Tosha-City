"use client";

import Link from "next/link";
import {
  HomeIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import DashboardFooter from "../(dashboard)/DashboardFooter";
const PageNotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50 px-6 py-16">
      <div className="max-w-xl w-full text-center">
        {/* 404 */}
        <h1 className="mt-8 text-7xl font-extrabold text-[#0D47A1] tracking-tight">
          404
        </h1>

        {/* Title */}
        <p className="mt-4 text-2xl font-semibold text-gray-800">
          Oops! Page Not Found
        </p>

        {/* Message */}
        <p className="mt-3 text-gray-600 leading-relaxed max-w-md mx-auto">
          The page you're looking for isn’t available. It might have been moved,
          renamed, or doesn’t exist.
        </p>

        {/* Card */}
        <div className="mt-10 bg-white rounded-2xl p-4 shadow-xl border border-gray-100">
          <div className="mb-6">
            <div className="flex items-center justify-center">
              <div className="h-14 w-14 rounded-xl bg-[#0D47A1] flex items-center justify-center text-2xl font-bold text-white">
                T
              </div>
            </div>
            <h2 className="mt-4 text-lg font-bold text-gray-900">
              ToshaCity Butchery
            </h2>
            <p className="text-gray-600 text-sm mt-1">Management System</p>
          </div>

          {/* Buttons */}
          <div className="space-y-4">
            <Link
              href="/"
              className="w-full py-3 flex items-center justify-center gap-2 bg-[#0D47A1] hover:bg-[#0D47A1]/90 text-white font-semibold rounded-xl shadow transition"
            >
              <HomeIcon className="h-5 w-5" />
              Return Home
            </Link>

            <Link
              href="/auth/login"
              className="w-full py-3 flex items-center justify-center gap-2 border-2 border-[#0D47A1] text-[#0D47A1] hover:bg-[#0D47A1]/5 font-medium rounded-xl transition"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              Go to Sign In
            </Link>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-500">
            Need help?{" "}
            <a
              href="mailto:admin@toshacity.co.ke"
              className="text-[#0D47A1] font-medium hover:underline"
            >
              admin@toshacity.co.ke
            </a>
            <DashboardFooter />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageNotFound;

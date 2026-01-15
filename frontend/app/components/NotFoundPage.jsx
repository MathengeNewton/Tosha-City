"use client";

import Link from "next/link";
import {
  HomeIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import DashboardFooter from "../(dashboard)/DashboardFooter";
import Image from "next/image";

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
              <Image
                width={600}
                height={500}
                className="h-12 lg:h-24 w-auto"
                src="/pcea-seeklogo.svg"
                alt="PCEA Logo"
              />
            </div>
            <h2 className="mt-4 text-lg font-bold text-gray-900">
              Presbyterian Church of East Africa
            </h2>
            <p className="text-gray-600 text-sm mt-1">Member & Admin Portal</p>
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
              href="mailto:admin@pcea.or.ke"
              className="text-[#0D47A1] font-medium hover:underline"
            >
              admin@pcea.or.ke
            </a>
            <DashboardFooter />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageNotFound;

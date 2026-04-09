import Link from "next/link";

export const metadata = {
  title: "Page not found",
  description: "This page could not be found.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <p className="text-sm font-medium text-gray-500">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Page not found</h1>
      <p className="mt-2 text-gray-600 text-center max-w-sm">
        The page you requested does not exist or was moved.
      </p>
      <Link
        href="/auth/login"
        className="mt-8 text-sm font-medium text-[#0D47A1] hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}

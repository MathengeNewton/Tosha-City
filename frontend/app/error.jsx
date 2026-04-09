"use client";

export default function Error({ error, reset }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <p className="text-sm font-medium text-gray-500">Error</p>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900">Something went wrong</h1>
      <p className="mt-2 text-gray-600 text-center max-w-md text-sm">Please try again.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-8 rounded-md bg-[#0D47A1] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e88b5]"
      >
        Try again
      </button>
    </div>
  );
}

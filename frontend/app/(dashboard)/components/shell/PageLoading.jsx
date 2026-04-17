"use client";

export function PageLoading({ message = "Loading…" }) {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-16 shadow-sm">
      <p className="text-gray-600">{message}</p>
    </div>
  );
}

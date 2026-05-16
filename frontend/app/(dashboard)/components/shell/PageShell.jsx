"use client";

/**
 * Standard LakeTown page canvas — gray field, consistent spacing, max width.
 */
export default function PageShell({ children, className = "" }) {
  return (
    <div
      className={`w-full max-w-[1600px] mx-auto space-y-6 sm:space-y-8 bg-gray-50 lg:p-2 min-h-full ${className}`.trim()}
    >
      {children}
    </div>
  );
}

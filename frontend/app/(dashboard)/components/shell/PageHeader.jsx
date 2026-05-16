"use client";

/**
 * Page title row: large heading, optional subtitle, optional action buttons (pass as children).
 */
export default function PageHeader({ title, subtitle, children, className = "" }) {
  return (
    <div
      className={`mb-2 sm:mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between ${className}`.trim()}
    >
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{title}</h1>
        {subtitle ? (
          <p className="text-gray-600 mt-1 text-sm sm:text-base">{subtitle}</p>
        ) : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

"use client";

import { useMemo } from "react";

/**
 * Shared Current Open Session banner: at-a-glance metrics and sales by product.
 * Props: session (with stats), sales (with items and items.product), onViewSession.
 */
export default function CurrentSessionBanner({ session, sales, onViewSession }) {
  const { totalSales, totalRevenue, totalSoldKgs, salesByProduct } = useMemo(() => {
    const totalSales = sales.length;
    const paidSales = sales.filter((s) => s.paymentStatus === "PAID");
    const totalRevenue = paidSales.reduce(
      (sum, s) => sum + parseFloat(s.totalAmount || 0),
      0
    );

    let totalSoldKgs = 0;
    const byProduct = {};

    sales.forEach((sale) => {
      sale.items?.forEach((item) => {
        const qty = parseFloat(item.quantity || 0);
        const rev = parseFloat(item.totalPrice || 0);
        totalSoldKgs += qty;
        const productName = item.product?.name || "Unknown";
        if (!byProduct[productName]) {
          byProduct[productName] = { name: productName, quantity: 0, revenue: 0 };
        }
        byProduct[productName].quantity += qty;
        byProduct[productName].revenue += rev;
      });
    });

    const salesByProduct = Object.values(byProduct).sort(
      (a, b) => b.revenue - a.revenue
    );

    return {
      totalSales,
      totalRevenue,
      totalSoldKgs,
      salesByProduct,
    };
  }, [sales]);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl shadow-sm border-2 border-blue-200 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Current Open Session: {new Date(session.date).toLocaleDateString()}
          </h3>

          {/* Key Metrics - 5 cards, responsive grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-white/70 p-3 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-600 mb-1">Opening Stock</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                {session.stats?.openingStockCount ?? 0}
              </p>
            </div>
            <div className="bg-white/70 p-3 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-600 mb-1">Incoming Stock</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                {session.stats?.incomingStockCount ?? 0}
              </p>
            </div>
            <div className="bg-white/70 p-3 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-600 mb-1">Total Sales</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                {totalSales}
              </p>
            </div>
            <div className="bg-white/70 p-3 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-600 mb-1">Total Sold (kg)</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                {totalSoldKgs.toLocaleString("en-KE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="bg-white/70 p-3 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-600 mb-1">Total Revenue</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                KES{" "}
                {totalRevenue.toLocaleString("en-KE", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          {/* Sales by product - compact, fixed max height so banner doesn't dominate the page */}
          <div className="mt-4 max-h-[140px] flex flex-col">
            <p className="text-xs font-medium text-gray-600 mb-2 shrink-0">
              Sales by product
            </p>
            {salesByProduct.length === 0 ? (
              <p className="text-sm text-gray-500">No sales yet today</p>
            ) : (
              <div className="overflow-auto -mx-1 min-h-0 flex-1">
                <table className="min-w-full text-sm border border-gray-200 rounded-lg">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 sm:px-3 py-1.5 text-left text-xs font-medium text-gray-600 uppercase">
                        Product
                      </th>
                      <th className="px-2 sm:px-3 py-1.5 text-right text-xs font-medium text-gray-600 uppercase">
                        Kg
                      </th>
                      <th className="px-2 sm:px-3 py-1.5 text-right text-xs font-medium text-gray-600 uppercase">
                        Revenue (KES)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {salesByProduct.slice(0, 10).map((row) => (
                      <tr key={row.name} className="hover:bg-gray-50/80">
                        <td className="px-2 sm:px-3 py-1.5 text-gray-900 whitespace-nowrap">
                          {row.name}
                        </td>
                        <td className="px-2 sm:px-3 py-1.5 text-right text-gray-700 whitespace-nowrap">
                          {row.quantity.toLocaleString("en-KE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-2 sm:px-3 py-1.5 text-right text-gray-700 whitespace-nowrap">
                          {row.revenue.toLocaleString("en-KE", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {salesByProduct.length > 10 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Top 10 by revenue · View session for full list
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onViewSession}
          className="bg-blue-900 text-white px-6 py-3 rounded-md hover:bg-[#1e88b5] transition-colors text-sm font-medium min-h-[44px] whitespace-nowrap w-full sm:w-auto shrink-0"
        >
          View Stock Session
        </button>
      </div>
    </div>
  );
}

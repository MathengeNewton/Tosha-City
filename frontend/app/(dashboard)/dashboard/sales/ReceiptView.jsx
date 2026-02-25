"use client";

/**
 * Receipt view for a paid sale. Rendered inside a wrapper with class receipt-print-only
 * so print styles can show only this block. Uses sale.soldBy and payment.receivedBy
 * (username || email; User entity has no .name).
 */
export default function ReceiptView({ sale, payment }) {
  if (!sale) return null;

  const servedBy = sale.soldBy?.username || sale.soldBy?.email || "N/A";
  const receivedBy = payment?.receivedBy?.username || payment?.receivedBy?.email || "N/A";

  return (
    <div className="receipt-print-only bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8 max-w-lg mx-auto">
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">ToshaCity Butchery</h2>
        <p className="text-gray-600 text-sm mt-1">Sale Receipt</p>
      </div>

      <div className="space-y-2 mb-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Sale #:</span>
          <span className="font-semibold">{sale.saleNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Date:</span>
          <span>{new Date(sale.soldAt).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Served by:</span>
          <span>{servedBy}</span>
        </div>
      </div>

      <div className="border-t border-b border-gray-200 py-4 mb-4">
        <h3 className="font-semibold text-gray-900 mb-3 text-sm">Items</h3>
        <div className="space-y-2 text-sm">
          {sale.items?.map((item, index) => (
            <div key={index} className="flex justify-between">
              <div>
                <span className="font-medium">{item.product?.name || "N/A"}</span>
                <span className="text-gray-600 ml-2">
                  ({item.quantity} {item.product?.unit || ""} × KES{" "}
                  {item.unitPrice ?? item.pricePerUnit ?? 0})
                </span>
              </div>
              <span className="font-semibold">
                KES{" "}
                {(item.totalPrice ??
                  item.quantity * (item.unitPrice ?? item.pricePerUnit ?? 0)
                ).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 text-sm">
        <span className="font-semibold text-gray-900">Total:</span>
        <span className="text-lg font-bold text-gray-900">
          KES{" "}
          {parseFloat(sale.totalAmount || 0).toLocaleString("en-KE", {
            minimumFractionDigits: 2,
          })}
        </span>
      </div>

      {payment && (
        <div className="border-t border-gray-200 pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Payment Method:</span>
            <span className="font-semibold">{payment.method}</span>
          </div>
          {payment.mpesaReference && (
            <div className="flex justify-between">
              <span className="text-gray-600">MPESA Reference:</span>
              <span className="font-semibold">{payment.mpesaReference}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Received by:</span>
            <span>{receivedBy}</span>
          </div>
        </div>
      )}
    </div>
  );
}

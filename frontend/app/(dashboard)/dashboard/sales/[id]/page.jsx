"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "../../../../../lib/api";
import { toast } from "react-toastify";

export default function SaleDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const saleId = params.id;
  const [loading, setLoading] = useState(true);
  const [sale, setSale] = useState(null);
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    if (saleId) {
      loadSaleData();
    }
  }, [saleId]);

  const loadSaleData = async () => {
    try {
      setLoading(true);
      
      const saleRes = await apiClient.sales.getById(saleId);
      setSale(saleRes.data);

      // Try to get payment
      try {
        const paymentRes = await apiClient.payments.getBySaleId(saleId);
        setPayment(paymentRes.data);
      } catch (error) {
        // Payment might not exist yet
        setPayment(null);
      }

    } catch (error) {
      console.error("Error loading sale:", error);
      toast.error("Failed to load sale details");
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!sale) return;

    const method = prompt("Enter payment method (CASH or MPESA):");
    if (!method || !['CASH', 'MPESA'].includes(method.toUpperCase())) {
      toast.error("Invalid payment method");
      return;
    }

    let mpesaReference = null;
    if (method.toUpperCase() === 'MPESA') {
      mpesaReference = prompt("Enter MPESA reference:");
      if (!mpesaReference) {
        toast.error("MPESA reference is required");
        return;
      }
    }

    try {
      await apiClient.payments.create({
        saleId: sale.id,
        amount: sale.totalAmount,
        method: method.toUpperCase(),
        mpesaReference: mpesaReference || undefined,
      });
      toast.success("Payment recorded successfully");
      loadSaleData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to record payment");
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading sale details...</div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen">
        <p className="text-gray-600">Sale not found</p>
      </div>
    );
  }

  return (
    <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Sale Details
          </h1>
          <p className="text-gray-600 mt-1">Sale #{sale.saleNumber}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrintReceipt}
            className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors text-sm"
          >
            Print Receipt
          </button>
          {sale.paymentStatus === 'PENDING' && (
            <button
              onClick={handleRecordPayment}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Receipt Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">ToshaCity Butchery</h2>
          <p className="text-gray-600">Sale Receipt</p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex justify-between">
            <span className="text-gray-600">Sale Number:</span>
            <span className="font-semibold">{sale.saleNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Date:</span>
            <span>{new Date(sale.soldAt).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Sold By:</span>
            <span>{sale.soldBy?.name || 'N/A'}</span>
          </div>
        </div>

        <div className="border-t border-b border-gray-200 py-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-4">Items</h3>
          <div className="space-y-2">
            {sale.items?.map((item, index) => (
              <div key={index} className="flex justify-between">
                <div>
                  <span className="font-medium">{item.product?.name || 'N/A'}</span>
                  <span className="text-gray-600 ml-2">
                    ({item.quantity} {item.product?.unit || ''} × KES {item.unitPrice || item.pricePerUnit || 0})
                  </span>
                </div>
                <span className="font-semibold">
                  KES {(item.totalPrice || (item.quantity * (item.unitPrice || item.pricePerUnit || 0))).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <span className="text-lg font-semibold text-gray-900">Total:</span>
          <span className="text-2xl font-bold text-gray-900">
            KES {parseFloat(sale.totalAmount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Payment Status */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Payment Status:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              sale.paymentStatus === 'PAID' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {sale.paymentStatus}
            </span>
          </div>

          {payment && (
            <div className="mt-4 space-y-2 text-sm">
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
                <span className="text-gray-600">Payment Date:</span>
                <span>{new Date(payment.receivedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Received By:</span>
                <span>{payment.receivedBy?.name || 'N/A'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <Link
          href="/dashboard/sales"
          className="bg-gray-200 text-gray-800 px-6 py-3 rounded-md hover:bg-gray-300 transition-colors"
        >
          Back to Sales
        </Link>
      </div>
    </div>
  );
}


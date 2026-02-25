"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../../../../lib/api";
import { toast } from "react-toastify";

export default function NewSalePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [saleItems, setSaleItems] = useState([]);
  const [availableStock, setAvailableStock] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [customerId, setCustomerId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get current session
      const sessionRes = await apiClient.stockSessions.getCurrent();
      const session = sessionRes.data;
      
      if (!session || session.status !== 'OPEN') {
        toast.error("No active stock session. Please open a session first.");
        router.push('/dashboard/stock');
        return;
      }

      setCurrentSession(session);

      // Get products
      const productsRes = await apiClient.products.getActive();
      const productsList = productsRes.data || [];
      setProducts(productsList);

      // Get credit customers
      const customersRes = await apiClient.customers.getAll({ type: 'CREDIT', activeOnly: true });
      setCustomers(customersRes.data || []);

      // Get available stock for each product
      const stockPromises = productsList.map(async (product) => {
        try {
          // We'll need to calculate available stock from stock entries and sales
          // For now, we'll just set a placeholder
          return { productId: product.id, available: 0 };
        } catch (error) {
          return { productId: product.id, available: 0 };
        }
      });

      const stockData = await Promise.all(stockPromises);
      const stockMap = {};
      stockData.forEach(s => {
        stockMap[s.productId] = s.available;
      });
      setAvailableStock(stockMap);

    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setSaleItems([...saleItems, { productId: '', amount: '', price: '', quantity: '' }]);
  };

  const removeItem = (index) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updated = [...saleItems];
    const item = updated[index];
    
    if (field === 'productId') {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        item.productId = value;
        // Auto-fill price from product's defaultPrice
        item.price = product.defaultPrice || product.pricePerUnit || 0;
        // Recalculate quantity if amount exists
        if (item.amount) {
          const amount = parseFloat(item.amount || 0);
          const unitPrice = parseFloat(item.price || 0);
          item.quantity = unitPrice > 0 ? (amount / unitPrice).toFixed(3) : '';
        }
      }
    } else if (field === 'amount') {
      item.amount = value;
      // Auto-calculate quantity from amount and unit price
      const amount = parseFloat(value || 0);
      const unitPrice = parseFloat(item.price || 0);
      item.quantity = unitPrice > 0 ? (amount / unitPrice).toFixed(3) : '';
    } else if (field === 'price') {
      // Allow manual override of price if needed
      item.price = value;
      // Recalculate quantity if amount exists
      if (item.amount) {
        const amount = parseFloat(item.amount || 0);
        const unitPrice = parseFloat(value || 0);
        item.quantity = unitPrice > 0 ? (amount / unitPrice).toFixed(3) : '';
      }
    } else {
      item[field] = value;
    }
    
    setSaleItems(updated);
  };

  const calculateTotal = () => {
    return saleItems.reduce((sum, item) => {
      const amount = parseFloat(item.amount || 0);
      return sum + amount;
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (saleItems.length === 0) {
      toast.error("Please add at least one item to the sale");
      return;
    }

    // Validate items
    for (const item of saleItems) {
      if (!item.productId || !item.amount || !item.price || !item.quantity) {
        toast.error("Please fill in all fields for all items");
        return;
      }
      const quantity = parseFloat(item.quantity);
      if (quantity <= 0) {
        toast.error("Invalid quantity calculated. Please check the amount and price.");
        return;
      }
    }

    try {
      // Validate credit sales require customer
      if (paymentMethod === 'CREDIT' && !customerId) {
        toast.error("Please select a customer for credit sales");
        return;
      }

      const saleData = {
        sessionId: currentSession.id,
        items: saleItems.map(item => {
          const quantity = parseFloat(item.quantity || 0);
          const unitPrice = parseFloat(item.price || 0);
          // Ensure quantity is calculated correctly from amount
          const calculatedQuantity = unitPrice > 0 ? (parseFloat(item.amount || 0) / unitPrice) : quantity;
          return {
            productId: parseInt(item.productId),
            quantity: calculatedQuantity,
            unitPrice: unitPrice,
          };
        }),
        paymentMethod: paymentMethod,
        customerId: paymentMethod === 'CREDIT' && customerId ? parseInt(customerId) : undefined,
      };

      const response = await apiClient.sales.create(saleData);
      toast.success("Sale created successfully!");
      router.push(`/dashboard/sales/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create sale");
    }
  };

  if (loading) {
    return (
      <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!currentSession) {
    return null;
  }

  return (
    <div className="w-full lg:p-2 space-y-4 sm:space-y-8 bg-gray-50 min-h-screen">
      <div className="mb-4 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            New Sale
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Create a new sale and generate receipt</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="space-y-6">
          {/* Sale Items */}
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Sale Items</h2>
              <button
                type="button"
                onClick={addItem}
                className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors text-sm min-h-[44px] w-full sm:w-auto"
              >
                Add Item
              </button>
            </div>

            {saleItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No items added yet. Click "Add Item" to start.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {saleItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-4 border border-gray-200 rounded-lg">
                    <div className="sm:col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product *
                      </label>
                      <select
                        value={item.productId}
                        onChange={(e) => updateItem(index, 'productId', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
                        required
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.unit}) - KES {product.defaultPrice || product.pricePerUnit || 0}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount (KES) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => updateItem(index, 'amount', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
                        required
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price per Unit (KES) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateItem(index, 'price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px] bg-gray-50"
                        placeholder="Auto-filled from product"
                        title="Auto-filled from product default price. You can override if needed."
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity (kg)
                      </label>
                      <input
                        type="text"
                        value={item.quantity || ''}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-base min-h-[44px] cursor-not-allowed"
                        placeholder="Auto-calculated"
                      />
                    </div>

                    <div className="sm:col-span-1 flex items-end">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="w-full bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 transition-colors text-sm min-h-[44px]"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="sm:col-span-1 flex items-end">
                      <p className="text-sm font-semibold text-gray-900">
                        KES {parseFloat(item.amount || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method and Customer */}
          <div className="border-t border-gray-200 pt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  if (e.target.value !== 'CREDIT') {
                    setCustomerId('');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
                required
              >
                <option value="CASH">Cash</option>
                <option value="MPESA">MPESA</option>
                <option value="CREDIT">Credit</option>
              </select>
            </div>
            {paymentMethod === 'CREDIT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
                  required
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.creditLimit ? `(Limit: KES ${parseFloat(customer.creditLimit).toLocaleString('en-KE', { minimumFractionDigits: 2 })})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
              <span className="text-2xl font-bold text-gray-900">
                KES {calculateTotal().toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-md hover:bg-gray-300 transition-colors min-h-[44px] text-base"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors min-h-[44px] text-base"
            >
              Create Sale
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}


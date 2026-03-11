"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../../../../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../../../../../contexts/AuthContext";

function getPromptLabel(product) {
  if (!product) return "Quantity";
  if (product.salesPrompt) return product.salesPrompt;
  if (product.saleMode === "CUP") return "Number of cups";
  if (product.saleMode === "PORTION") return "Number of portions";
  if (product.saleMode === "PIECE") return "Number of pieces";
  return `Quantity (${product.unit || "kg"})`;
}

export default function NewSalePage() {
  const router = useRouter();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [loading, setLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [saleItems, setSaleItems] = useState([]);
  const [availableStock, setAvailableStock] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [customerId, setCustomerId] = useState('');

  useEffect(() => {
    initializeBranchContext();
  }, [user?.branchId, isAdmin]);

  useEffect(() => {
    if (isAdmin ? selectedBranchId : user?.branchId) {
      loadData();
    }
  }, [selectedBranchId, user?.branchId, isAdmin]);

  const initializeBranchContext = async () => {
    try {
      if (isAdmin) {
        const branchesRes = await apiClient.branches.getAll({ activeOnly: true });
        const branchList = branchesRes.data || [];
        setBranches(branchList);
        if (!selectedBranchId && branchList.length > 0) {
          setSelectedBranchId(String(branchList[0].id));
        }
      } else if (user?.branchId) {
        setSelectedBranchId(String(user.branchId));
      }
    } catch (error) {
      console.error("Error loading branches:", error);
      toast.error("Failed to load branches");
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const branchId = isAdmin ? parseInt(selectedBranchId, 10) : user?.branchId;
      if (!branchId) {
        setCurrentSession(null);
        setLoading(false);
        return;
      }
      
      // Get current session
      const sessionRes = await apiClient.stockSessions.getCurrent({ branchId });
      const session = sessionRes.data;
      
      if (!session || session.status !== 'OPEN') {
        setCurrentSession(null);
        if (!isAdmin) {
          toast.error("No active stock session. Please open a session first.");
          router.push('/dashboard/stock');
        }
        return;
      }

      setCurrentSession(session);

      // Get products
      const productsRes = await apiClient.products.getActive();
      const productsList = productsRes.data || [];
      setProducts(productsList);

      // Get credit and wholesale customers (for credit sales and wholesale pricing)
      const customersRes = await apiClient.customers.getAll({ activeOnly: true });
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
    const currentProduct = products.find(p => p.id === parseInt(item.productId));
    
    if (field === 'productId') {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        item.productId = value;
        // Use wholesale price when wholesale customer selected (fallback to retail if wholesale not set)
        const selectedCustomer = customerId ? customers.find(c => c.id === parseInt(customerId)) : null;
        const useWholesale = selectedCustomer?.type === 'WHOLESALE';
        const retail = product.defaultPrice ?? product.pricePerUnit ?? 0;
        item.price = useWholesale ? (product.wholesalePrice ?? retail) : retail;
        if (product.saleMode === "WEIGHT") {
          item.quantity = item.quantity || '';
          if (item.amount) {
            const amount = parseFloat(item.amount || 0);
            const unitPrice = parseFloat(item.price || 0);
            item.quantity = unitPrice > 0 ? (amount / unitPrice).toFixed(3) : '';
          }
        } else {
          const qty = parseFloat(item.quantity || 1);
          item.quantity = qty > 0 ? String(qty) : '1';
          item.amount = ((parseFloat(item.quantity || 1) || 1) * parseFloat(item.price || 0)).toFixed(2);
        }
      }
    } else if (field === 'amount') {
      item.amount = value;
      if ((currentProduct?.saleMode || 'WEIGHT') === 'WEIGHT') {
        const amount = parseFloat(value || 0);
        const unitPrice = parseFloat(item.price || 0);
        item.quantity = unitPrice > 0 ? (amount / unitPrice).toFixed(3) : '';
      }
    } else if (field === 'price') {
      item.price = value;
      if ((currentProduct?.saleMode || 'WEIGHT') === 'WEIGHT') {
        if (item.amount) {
          const amount = parseFloat(item.amount || 0);
          const unitPrice = parseFloat(value || 0);
          item.quantity = unitPrice > 0 ? (amount / unitPrice).toFixed(3) : '';
        }
      } else {
        const qty = parseFloat(item.quantity || 0);
        item.amount = qty > 0 ? (qty * parseFloat(value || 0)).toFixed(2) : '';
      }
    } else if (field === 'quantity') {
      item.quantity = value;
      if ((currentProduct?.saleMode || 'WEIGHT') !== 'WEIGHT') {
        const qty = parseFloat(value || 0);
        const unitPrice = parseFloat(item.price || 0);
        item.amount = qty > 0 ? (qty * unitPrice).toFixed(2) : '';
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
          const product = products.find(p => p.id === parseInt(item.productId));
          const quantity = parseFloat(item.quantity || 0);
          const unitPrice = parseFloat(item.price || 0);
          const calculatedQuantity = product?.saleMode === 'WEIGHT'
            ? (unitPrice > 0 ? (parseFloat(item.amount || 0) / unitPrice) : quantity)
            : quantity;
          return {
            productId: parseInt(item.productId),
            quantity: calculatedQuantity,
            unitPrice: unitPrice,
          };
        }),
        paymentMethod: paymentMethod,
        customerId: customerId ? parseInt(customerId) : undefined,
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
    return (
      <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Sale</h1>
            <p className="text-gray-600 mt-1">Select a branch with an open stock session to continue.</p>
          </div>
          {isAdmin && (
            <div className="max-w-sm">
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="button"
            onClick={() => router.push("/dashboard/stock")}
            className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors"
          >
            Go to Stock Sessions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full lg:p-2 space-y-4 sm:space-y-8 bg-gray-50 min-h-screen">
      <div className="mb-4 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            New Sale
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Create a new sale and generate receipt</p>
          <p className="text-gray-500 mt-1 text-sm">
            Branch: {currentSession.branch?.name || user?.branch?.name || "Unassigned"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="space-y-6">
          {isAdmin && (
            <div className="border-b border-gray-200 pb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {/* Customer & payment first so wholesale selection applies to items */}
          <div className="border-b border-gray-200 pb-4 space-y-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {paymentMethod === 'CREDIT' ? 'Customer *' : 'Customer (optional – for wholesale pricing)'}
              </label>
              <select
                value={customerId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setCustomerId(newId);
                  const selectedCustomer = newId ? customers.find(c => c.id === parseInt(newId)) : null;
                  const useWholesale = selectedCustomer?.type === 'WHOLESALE';
                  setSaleItems(prev => prev.map(item => {
                    const product = products.find(p => p.id === parseInt(item.productId));
                    if (!product) return item;
                    const retail = product.defaultPrice ?? product.pricePerUnit ?? 0;
                    const newPrice = useWholesale ? (product.wholesalePrice ?? retail) : retail;
                    if ((product.saleMode || 'WEIGHT') === 'WEIGHT') {
                      const amount = parseFloat(item.amount || 0);
                      const quantity = newPrice > 0 && amount > 0 ? (amount / newPrice).toFixed(3) : item.quantity;
                      return { ...item, price: newPrice, quantity };
                    }
                    const quantity = parseFloat(item.quantity || 0);
                    const amount = quantity > 0 ? (quantity * newPrice).toFixed(2) : item.amount;
                    return { ...item, price: newPrice, amount };
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
                required={paymentMethod === 'CREDIT'}
              >
                <option value="">{paymentMethod === 'CREDIT' ? 'Select a customer' : 'None'}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} {customer.type === 'CREDIT' && customer.creditLimit ? `(Limit: KES ${parseFloat(customer.creditLimit).toLocaleString('en-KE', { minimumFractionDigits: 2 })})` : ''} {customer.type === 'WHOLESALE' ? '(Wholesale)' : ''}
                  </option>
                ))}
              </select>
            </div>
            {customerId && customers.find(c => c.id === parseInt(customerId))?.type === 'WHOLESALE' && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-800">
                <span className="font-medium">Wholesale sale</span> – Prices shown are wholesale. Add items below.
              </div>
            )}
          </div>

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
                    {(() => {
                      const selectedProduct = products.find((product) => product.id === parseInt(item.productId));
                      const saleMode = selectedProduct?.saleMode || 'WEIGHT';
                      const isWeightSale = saleMode === 'WEIGHT';
                      const promptLabel = getPromptLabel(selectedProduct);
                      return (
                        <>
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
                            {product.name} ({product.unit}) – Retail KES {parseFloat(product.defaultPrice || product.pricePerUnit || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                            {product.wholesalePrice != null ? ` | Wholesale KES ${parseFloat(product.wholesalePrice).toLocaleString('en-KE', { minimumFractionDigits: 2 })}` : ''}
                            {product.saleMode && product.saleMode !== 'WEIGHT' ? ` | ${product.saleMode}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {isWeightSale ? 'Amount (KES) *' : 'Amount (KES)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => updateItem(index, 'amount', e.target.value)}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md text-base min-h-[44px] ${isWeightSale ? 'focus:outline-none focus:ring-2 focus:ring-blue-500' : 'bg-gray-50 cursor-not-allowed'}`}
                        required={isWeightSale}
                        readOnly={!isWeightSale}
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price per Unit (KES) * {customerId && customers.find(c => c.id === parseInt(customerId))?.type === 'WHOLESALE' ? <span className="text-green-600 font-normal">(wholesale)</span> : ''}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateItem(index, 'price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px] bg-gray-50"
                        placeholder="Auto-filled from product"
                        title={customerId && customers.find(c => c.id === parseInt(customerId))?.type === 'WHOLESALE' ? 'Wholesale price from product' : 'Retail price from product. Select a wholesale customer above for wholesale pricing.'}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {promptLabel}
                      </label>
                      <input
                        type={isWeightSale ? "text" : "number"}
                        step={isWeightSale ? undefined : "0.01"}
                        value={item.quantity || ''}
                        readOnly={isWeightSale}
                        onChange={isWeightSale ? undefined : (e) => updateItem(index, 'quantity', e.target.value)}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-md text-base min-h-[44px] ${isWeightSale ? 'bg-gray-50 cursor-not-allowed' : 'focus:outline-none focus:ring-2 focus:ring-blue-500'}`}
                        placeholder={isWeightSale ? "Auto-calculated" : `Enter ${selectedProduct?.unit || 'quantity'}`}
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
                        </>
                      );
                    })()}
                  </div>
                ))}
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


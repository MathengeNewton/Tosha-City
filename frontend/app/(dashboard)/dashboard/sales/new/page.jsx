"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../../../../lib/api";
import { toast } from "react-toastify";
import { useAuth } from "../../../../../contexts/AuthContext";
import { PageShell, PageHeader, PageLoading } from "../../../components/shell";

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
  /** After branch picker fetch finishes (admin) or cashier branch resolved — avoids spinner forever when loadData never runs. */
  const [branchInitDone, setBranchInitDone] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [saleItems, setSaleItems] = useState([]);
  const [availableStock, setAvailableStock] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [customerId, setCustomerId] = useState('');
  const [productSearch, setProductSearch] = useState("");

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => (p.name || "").toLowerCase().includes(q));
  }, [products, productSearch]);

  useEffect(() => {
    initializeBranchContext();
  }, [user?.branchId, isAdmin]);

  useEffect(() => {
    const branchId = isAdmin ? selectedBranchId : user?.branchId;
    if (branchId) {
      loadData();
    } else if (branchInitDone) {
      setLoading(false);
    }
  }, [selectedBranchId, user?.branchId, isAdmin, branchInitDone]);

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
    } finally {
      setBranchInitDone(true);
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

  const buildItemFromProduct = (product) => {
    const selectedCustomer = customerId ? customers.find((c) => c.id === parseInt(customerId, 10)) : null;
    const useWholesale = selectedCustomer?.type === "WHOLESALE";
    const retail = product.defaultPrice ?? product.pricePerUnit ?? 0;
    const price = useWholesale ? product.wholesalePrice ?? retail : retail;
    const item = {
      productId: String(product.id),
      price: String(price),
      amount: "",
      quantity: "",
    };
    if ((product.saleMode || "WEIGHT") === "WEIGHT") {
      return item;
    }
    item.quantity = "1";
    item.amount = (parseFloat(item.quantity) * parseFloat(item.price || 0)).toFixed(2);
    return item;
  };

  const quickAddProduct = (product) => {
    setSaleItems((prev) => [...prev, buildItemFromProduct(product)]);
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
          const unitPrice = parseFloat(item.price || 0);
          if (item.amount != null && String(item.amount).trim() !== '') {
            const amount = parseFloat(item.amount || 0);
            item.quantity =
              unitPrice > 0 && Number.isFinite(amount) && amount > 0
                ? (amount / unitPrice).toFixed(3)
                : '';
          } else if (item.quantity != null && String(item.quantity).trim() !== '') {
            const qty = parseFloat(item.quantity || 0);
            item.amount =
              qty > 0 && unitPrice > 0 ? (qty * unitPrice).toFixed(2) : '';
          } else {
            item.quantity = item.quantity || '';
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
        if (value === '' || String(value).trim() === '' || !Number.isFinite(amount) || amount <= 0) {
          item.quantity = '';
        } else {
          item.quantity = unitPrice > 0 ? (amount / unitPrice).toFixed(3) : '';
        }
      }
    } else if (field === 'price') {
      item.price = value;
      const unitPrice = parseFloat(value || 0);
      if ((currentProduct?.saleMode || 'WEIGHT') === 'WEIGHT') {
        if (item.amount && String(item.amount).trim() !== '') {
          const amount = parseFloat(item.amount || 0);
          item.quantity = unitPrice > 0 ? (amount / unitPrice).toFixed(3) : '';
        } else if (item.quantity && String(item.quantity).trim() !== '') {
          const qty = parseFloat(item.quantity || 0);
          item.amount = qty > 0 && unitPrice > 0 ? (qty * unitPrice).toFixed(2) : '';
        }
      } else {
        const qty = parseFloat(item.quantity || 0);
        item.amount = qty > 0 ? (qty * unitPrice).toFixed(2) : '';
      }
    } else if (field === 'quantity') {
      item.quantity = value;
      const qty = parseFloat(value || 0);
      const unitPrice = parseFloat(item.price || 0);
      if ((currentProduct?.saleMode || 'WEIGHT') === 'WEIGHT') {
        if (value === '' || String(value).trim() === '' || !Number.isFinite(qty) || qty <= 0) {
          item.amount = '';
        } else {
          item.amount = unitPrice > 0 ? (qty * unitPrice).toFixed(2) : '';
        }
      } else {
        item.amount = qty > 0 && Number.isFinite(qty) ? (qty * unitPrice).toFixed(2) : '';
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
      <PageShell>
        <PageLoading message="Loading…" />
      </PageShell>
    );
  }

  if (!currentSession) {
    return (
      <PageShell className="space-y-6">
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
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-4 sm:space-y-6">
      <PageHeader
        title="New Sale"
        subtitle="Tap products to add lines quickly, then enter amounts. Same flow as before — fewer clicks to get started."
      />
      <p className="-mt-2 text-sm text-gray-500">
        Branch: {currentSession.branch?.name || user?.branch?.name || "Unassigned"}
      </p>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="space-y-6 pb-28 sm:pb-32">
          {isAdmin && (
            <div className="border-b border-gray-200 pb-4">
              <label className="mb-2 block text-sm font-semibold text-gray-800">Branch *</label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full max-w-md rounded-xl border border-gray-300 px-4 py-3 text-base min-h-[48px] focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-4 border-b border-gray-200 pb-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-800">Payment *</label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  if (e.target.value !== "CREDIT") {
                    setCustomerId("");
                  }
                }}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base font-medium min-h-[52px] touch-manipulation focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                required
              >
                <option value="CASH">Cash</option>
                <option value="MPESA">M-Pesa</option>
                <option value="CREDIT">Credit</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                {paymentMethod === "CREDIT" ? "Customer *" : "Customer (wholesale / credit)"}
              </label>
              <select
                value={customerId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setCustomerId(newId);
                  const selectedCustomer = newId ? customers.find((c) => c.id === parseInt(newId, 10)) : null;
                  const useWholesale = selectedCustomer?.type === "WHOLESALE";
                  setSaleItems((prev) =>
                    prev.map((item) => {
                      const product = products.find((p) => p.id === parseInt(item.productId, 10));
                      if (!product) return item;
                      const retail = product.defaultPrice ?? product.pricePerUnit ?? 0;
                      const newPrice = useWholesale ? product.wholesalePrice ?? retail : retail;
                      if ((product.saleMode || "WEIGHT") === "WEIGHT") {
                        const amountNum = parseFloat(item.amount || 0);
                        const qtyNum = parseFloat(item.quantity || 0);
                        if (item.amount !== "" && item.amount != null && amountNum > 0 && newPrice > 0) {
                          const quantity = (amountNum / newPrice).toFixed(3);
                          return { ...item, price: String(newPrice), quantity };
                        }
                        if (item.quantity !== "" && item.quantity != null && qtyNum > 0 && newPrice > 0) {
                          const amount = (qtyNum * newPrice).toFixed(2);
                          return { ...item, price: String(newPrice), amount };
                        }
                        return { ...item, price: String(newPrice) };
                      }
                      const quantity = parseFloat(item.quantity || 0);
                      const amount = quantity > 0 ? (quantity * newPrice).toFixed(2) : item.amount;
                      return { ...item, price: String(newPrice), amount };
                    }),
                  );
                }}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base min-h-[52px] touch-manipulation focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                required={paymentMethod === "CREDIT"}
              >
                <option value="">{paymentMethod === "CREDIT" ? "Select a customer" : "None"}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}{" "}
                    {customer.type === "CREDIT" && customer.creditLimit
                      ? `(Limit: KES ${parseFloat(customer.creditLimit).toLocaleString("en-KE", { minimumFractionDigits: 2 })})`
                      : ""}{" "}
                    {customer.type === "WHOLESALE" ? "(Wholesale)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {customerId && customers.find((c) => c.id === parseInt(customerId, 10))?.type === "WHOLESALE" && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-900">
              Wholesale customer — new taps use wholesale price where set.
            </div>
          )}

          {/* Quick-add grid */}
          <section className="rounded-2xl border-2 border-gray-100 bg-gradient-to-b from-gray-50/90 to-white p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 sm:text-xl">Quick add</h2>
                <p className="mt-0.5 text-sm text-gray-600">
                  Large buttons for busy tills. Weight items: enter <strong>KES amount</strong> or <strong>kg</strong> on the line.
                </p>
              </div>
              <input
                type="search"
                placeholder="Search products…"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base shadow-sm min-h-[52px] sm:max-w-sm touch-manipulation focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                autoComplete="off"
              />
            </div>
            <div className="max-h-[min(42vh,440px)] overflow-y-auto overscroll-contain pr-1">
              {filteredProducts.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500">
                  {productSearch.trim()
                    ? "No products match this search."
                    : "No products available for this branch."}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
                  {filteredProducts.map((product) => {
                    const retail = product.defaultPrice ?? product.pricePerUnit ?? 0;
                    const selectedCustomer = customerId
                      ? customers.find((c) => c.id === parseInt(customerId, 10))
                      : null;
                    const useWholesale = selectedCustomer?.type === "WHOLESALE";
                    const showPrice =
                      useWholesale && product.wholesalePrice != null ? product.wholesalePrice : retail;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => quickAddProduct(product)}
                        className="touch-manipulation flex min-h-[88px] flex-col items-start justify-between rounded-2xl border-2 border-gray-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-900/40 hover:shadow-md active:scale-[0.98] sm:min-h-[96px] sm:p-4"
                      >
                        <span className="line-clamp-2 text-sm font-bold leading-snug text-gray-900 sm:text-base">
                          {product.name}
                        </span>
                        <span className="mt-1 text-xs text-gray-500">
                          {product.unit} · {product.saleMode || "WEIGHT"}
                        </span>
                        <span className="mt-2 text-base font-bold tabular-nums text-blue-900 sm:text-lg">
                          KES{" "}
                          {Number(showPrice).toLocaleString("en-KE", {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-4 text-sm font-semibold text-blue-900 underline-offset-2 hover:underline min-h-[44px] px-1 py-2 touch-manipulation"
            >
              Add empty line (pick product manually)
            </button>
          </section>

          {/* Line items */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-gray-900 sm:text-xl">This sale</h2>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700 tabular-nums">
                {saleItems.length} line{saleItems.length === 1 ? "" : "s"}
              </span>
            </div>

            {saleItems.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-4 py-12 text-center">
                <p className="text-base font-medium text-gray-700">Basket is empty</p>
                <p className="mt-2 text-sm text-gray-500">Tap a product above, or add an empty line.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {saleItems.map((item, index) => (
                  <div
                    key={`${index}-${item.productId || "x"}`}
                    className="rounded-2xl border-2 border-gray-200 bg-gray-50/40 p-4 sm:p-5"
                  >
                    {(() => {
                      const selectedProduct = products.find((product) => product.id === parseInt(item.productId, 10));
                      const saleMode = selectedProduct?.saleMode || "WEIGHT";
                      const isWeightSale = saleMode === "WEIGHT";
                      const promptLabel = getPromptLabel(selectedProduct);
                      return (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:gap-4">
                          <div className="sm:col-span-4">
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Product
                            </label>
                            <select
                              value={item.productId}
                              onChange={(e) => updateItem(index, "productId", e.target.value)}
                              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-base min-h-[48px] touch-manipulation focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                              required
                            >
                              <option value="">Select product</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name} ({product.unit}) – KES{" "}
                                  {parseFloat(product.defaultPrice || product.pricePerUnit || 0).toLocaleString("en-KE", {
                                    minimumFractionDigits: 0,
                                  })}
                                  {product.wholesalePrice != null
                                    ? ` | W ${parseFloat(product.wholesalePrice).toLocaleString("en-KE", { minimumFractionDigits: 0 })}`
                                    : ""}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-3">
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {isWeightSale ? "Amount (KES) *" : "Amount (KES)"}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.amount}
                              onChange={(e) => updateItem(index, "amount", e.target.value)}
                              className={`w-full rounded-xl border border-gray-300 px-3 py-3 text-base min-h-[48px] touch-manipulation ${
                                isWeightSale
                                  ? "bg-white focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                                  : "cursor-not-allowed bg-gray-100 text-gray-600"
                              }`}
                              required={isWeightSale}
                              readOnly={!isWeightSale}
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Unit price (KES) *
                              {customerId &&
                              customers.find((c) => c.id === parseInt(customerId, 10))?.type === "WHOLESALE" ? (
                                <span className="font-normal normal-case text-green-700"> · wholesale</span>
                              ) : null}
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => updateItem(index, "price", e.target.value)}
                              className="w-full rounded-xl border border-gray-300 bg-gray-100 px-3 py-3 text-base min-h-[48px] touch-manipulation focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                              placeholder="From product"
                              title={
                                customerId &&
                                customers.find((c) => c.id === parseInt(customerId, 10))?.type === "WHOLESALE"
                                  ? "Wholesale unit price"
                                  : "Retail unit price"
                              }
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {promptLabel}
                            </label>
                            <input
                              type="number"
                              step={isWeightSale ? "0.001" : "0.01"}
                              min="0"
                              value={item.quantity || ""}
                              onChange={(e) => updateItem(index, "quantity", e.target.value)}
                              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-base min-h-[48px] touch-manipulation focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                              placeholder={
                                isWeightSale ? `${selectedProduct?.unit || "kg"}` : `Qty (${selectedProduct?.unit || ""})`
                              }
                            />
                          </div>

                          <div className="flex flex-col justify-end gap-2 sm:col-span-12 sm:flex-row sm:items-end sm:justify-between">
                            <p className="text-lg font-bold tabular-nums text-gray-900 sm:order-2">
                              Line: KES {parseFloat(item.amount || 0).toFixed(2)}
                            </p>
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="w-full rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-center text-base font-semibold text-red-800 hover:bg-red-100 min-h-[48px] touch-manipulation sm:w-auto sm:min-w-[140px] sm:order-1"
                            >
                              Remove line
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 sm:px-6">
            <span className="text-lg font-semibold text-gray-800">Total</span>
            <span className="text-2xl font-bold tabular-nums text-gray-900 sm:text-3xl">
              KES {calculateTotal().toLocaleString("en-KE", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div
            className={`${
              saleItems.length > 0
                ? "sticky bottom-0 -mx-4 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6"
                : "border-t border-gray-200 pt-4"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 rounded-xl border-2 border-gray-300 bg-gray-100 px-6 py-4 text-center text-base font-semibold text-gray-800 hover:bg-gray-200 min-h-[56px] touch-manipulation sm:min-h-[60px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-[2] rounded-xl bg-green-600 px-6 py-4 text-center text-lg font-bold text-white shadow-md hover:bg-green-700 active:bg-green-800 min-h-[56px] touch-manipulation sm:min-h-[60px] sm:text-xl"
              >
                Create sale
              </button>
            </div>
          </div>
        </div>
      </form>
    </PageShell>
  );
}


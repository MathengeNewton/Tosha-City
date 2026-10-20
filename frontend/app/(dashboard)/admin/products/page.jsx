"use client";
import { useState, useEffect, useMemo } from "react";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";
import { exportToExcel } from "../../../../lib/exportExcel";
import { useAuth } from "../../../../contexts/AuthContext";
import { defaultDateRangeYmd, todayYmd } from "../../../../lib/time";
import {
  PRODUCT_TYPES,
  configForProductType,
  emptyProductForm,
  formFromProduct,
  payloadFromForm,
  productTypeKey,
  typeBadgeClass,
} from "../../../../lib/productCatalog";

const { dateFrom: defaultDateFrom, dateTo: defaultDateTo } = defaultDateRangeYmd(365);

function filterByDateRange(items, dateFrom, dateTo, dateKey = "createdAt") {
  if (!dateFrom && !dateTo) return items;
  return items.filter((item) => {
    const d = item[dateKey] ? new Date(item[dateKey]) : null;
    if (!d) return true;
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (d < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (d > to) return false;
    }
    return true;
  });
}

export default function ProductsPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [filters, setFilters] = useState({
    dateFrom: defaultDateFrom,
    dateTo: defaultDateTo,
  });
  const [formData, setFormData] = useState(() => emptyProductForm());

  const typeConfig = configForProductType(formData.productType);

  const filteredProducts = useMemo(
    () => filterByDateRange(products, filters.dateFrom, filters.dateTo),
    [products, filters.dateFrom, filters.dateTo]
  );

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.products.getAll();
      const list = (response.data || []).map((product) => ({
        ...product,
        pricePerUnit: product.defaultPrice || product.pricePerUnit || 0,
      }));
      setProducts(list);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const setProductType = (typeKey) => {
    const cfg = configForProductType(typeKey);
    setFormData((prev) => ({
      ...prev,
      productType: typeKey,
      unit: cfg.unitOptions.some((o) => o.value === prev.unit) ? prev.unit : cfg.defaultUnit,
      parentProductId: cfg.showParentProduct ? prev.parentProductId : "",
    }));
  };

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData(formFromProduct(product));
    } else {
      setEditingProduct(null);
      setFormData(emptyProductForm());
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData(emptyProductForm());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const price = parseFloat(formData.pricePerUnit);
    if (Number.isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price greater than 0");
      return;
    }
    if (typeConfig.showWholesale && formData.wholesalePricePerUnit) {
      const wholesaleInput = parseFloat(formData.wholesalePricePerUnit);
      if (Number.isNaN(wholesaleInput) || wholesaleInput < 0) {
        toast.error("Wholesale price must be 0 or greater");
        return;
      }
    }

    try {
      const data = payloadFromForm(formData);

      if (editingProduct) {
        await apiClient.products.update(editingProduct.id, data);
        toast.success("Product updated successfully");
      } else {
        await apiClient.products.create(data);
        toast.success("Product created successfully");
      }

      handleCloseModal();
      loadProducts();
    } catch (error) {
      console.error("Product save error:", error);
      toast.error(error.response?.data?.message || "Failed to save product");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      await apiClient.products.delete(id);
      toast.success("Product deleted successfully");
      loadProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete product");
    }
  };

  const handleToggleActive = async (product) => {
    try {
      const typeKey = productTypeKey(product);
      const cfg = configForProductType(typeKey);
      await apiClient.products.update(product.id, {
        name: product.name,
        unit: product.unit,
        defaultPrice: product.defaultPrice || product.pricePerUnit || 0,
        wholesalePrice: product.wholesalePrice ?? undefined,
        category: product.category || cfg.value,
        segment: product.segment || cfg.segment,
        saleMode: product.saleMode || cfg.saleMode,
        isActive: !product.isActive,
        parentProductId: product.parentProductId ?? undefined,
      });
      toast.success(`Product ${product.isActive ? "deactivated" : "activated"} successfully`);
      loadProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update product");
    }
  };

  const parentOptions = products.filter(
    (p) =>
      p.isActive &&
      p.category !== "PRODUCTION_ITEM" &&
      (!editingProduct || p.id !== editingProduct.id)
  );

  if (loading) {
    return (
      <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="w-full lg:p-2 space-y-4 sm:space-y-8 bg-gray-50 min-h-screen">
      <div className="mb-4 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Products Management
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Raw meat by weight, or production items sold per piece (mutura, soup, etc.)
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              const rows = filteredProducts.map((p) => {
                const tk = productTypeKey(p);
                const cfg = configForProductType(tk);
                return {
                  name: p.name,
                  type: cfg.shortLabel,
                  unit: p.unit,
                  pricePerUnit: parseFloat(p.defaultPrice || p.pricePerUnit || 0),
                  status: p.isActive ? "Active" : "Inactive",
                  createdAt: p.createdAt ? new Date(p.createdAt).toLocaleString() : "",
                };
              });
              exportToExcel(
                rows,
                [
                  { key: "name", label: "Name" },
                  { key: "type", label: "Type" },
                  { key: "unit", label: "Unit" },
                  { key: "pricePerUnit", label: "Price (KES)" },
                  { key: "status", label: "Status" },
                  { key: "createdAt", label: "Created" },
                ],
                `products-export-${todayYmd()}`
              );
              toast.success("Excel exported");
            }}
            className="flex-1 sm:flex-none bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 text-sm font-medium min-h-[44px]"
          >
            Export Excel
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex-1 sm:flex-none bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors text-sm min-h-[44px]"
          >
            Add Product
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Unit
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">
                  Retail (KES)
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                  Wholesale (KES)
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 sm:px-6 py-4 text-center text-gray-500">
                    No products found. Create your first product!
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const tk = productTypeKey(product);
                  const cfg = configForProductType(tk);
                  const priceLabel =
                    tk === "PRODUCTION_ITEM" ? "per piece" : `per ${product.unit}`;
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {product.name}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${typeBadgeClass(tk)}`}
                        >
                          {cfg.shortLabel}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.unit}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 hidden sm:table-cell">
                        {parseFloat(product.defaultPrice || product.pricePerUnit || 0).toLocaleString(
                          "en-KE",
                          { minimumFractionDigits: 2 }
                        )}{" "}
                        <span className="text-gray-500 font-normal text-xs">{priceLabel}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                        {product.wholesalePrice != null
                          ? parseFloat(product.wholesalePrice).toLocaleString("en-KE", {
                              minimumFractionDigits: 2,
                            })
                          : "–"}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            product.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {product.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-col sm:flex-row gap-2">
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenModal(product)}
                                className="text-blue-600 hover:text-blue-800 min-h-[44px] sm:min-h-0 text-left"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleActive(product)}
                                className="text-yellow-600 hover:text-yellow-800 min-h-[44px] sm:min-h-0 text-left"
                              >
                                {product.isActive ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(product.id)}
                                className="text-red-600 hover:text-red-800 min-h-[44px] sm:min-h-0 text-left"
                              >
                                Delete
                              </button>
                            </>
                          )}
                          {!isAdmin && <span className="text-gray-400 text-sm">View only</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
              {editingProduct ? "Edit Product" : "Add Product"}
            </h2>
            <p className="text-sm text-gray-500 mb-4">Choose what kind of product you are adding first.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-gray-700">Product type *</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.values(PRODUCT_TYPES).map((type) => {
                    const selected = formData.productType === type.value;
                    return (
                      <label
                        key={type.value}
                        className={`relative flex cursor-pointer rounded-lg border p-3 transition-colors ${
                          selected
                            ? "border-[#0D47A1] bg-blue-50 ring-1 ring-[#0D47A1]"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="productType"
                          value={type.value}
                          checked={selected}
                          onChange={() => setProductType(type.value)}
                          className="sr-only"
                        />
                        <div>
                          <span className="block text-sm font-semibold text-gray-900">
                            {type.label}
                          </span>
                          <span className="block text-xs text-gray-600 mt-1">{type.description}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {formData.productType === "PRODUCTION_ITEM" && (
                <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
                  Production items are made in the stock session <strong>Production</strong> tab using
                  a recipe. After you save this product, add a recipe that outputs it.
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
                  placeholder={
                    formData.productType === "PRODUCTION_ITEM" ? "e.g. Mutura" : "e.g. Beef"
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
                    required
                  >
                    {typeConfig.unitOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {typeConfig.priceLabel} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.pricePerUnit}
                    onChange={(e) => setFormData({ ...formData, pricePerUnit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
                    placeholder={formData.productType === "PRODUCTION_ITEM" ? "20" : "800"}
                    required
                  />
                </div>

                {typeConfig.showWholesale && (
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {typeConfig.wholesaleLabel}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.wholesalePricePerUnit}
                      onChange={(e) =>
                        setFormData({ ...formData, wholesalePricePerUnit: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
                      placeholder="Optional — defaults to retail if blank"
                    />
                  </div>
                )}
              </div>

              {typeConfig.showParentProduct && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent product (for byproducts)
                  </label>
                  <select
                    value={formData.parentProductId}
                    onChange={(e) => setFormData({ ...formData, parentProductId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
                  >
                    <option value="">None (main product)</option>
                    {parentOptions.map((p) => (
                      <option key={p.id} value={p.id.toString()}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    e.g. link &quot;Minced meat&quot; to &quot;Beef&quot; (raw stock only).
                  </p>
                </div>
              )}

              <div className="flex items-center min-h-[44px]">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                  Active
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-3 rounded-md hover:bg-gray-300 transition-colors min-h-[44px] text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-900 text-white px-4 py-3 rounded-md hover:bg-[#1e88b5] transition-colors min-h-[44px] text-base"
                >
                  {editingProduct ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { useState, useEffect, useMemo } from "react";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";
import { exportToExcel } from "../../../../lib/exportExcel";
import { useAuth } from "../../../../contexts/AuthContext";
import ProductWizard from "./ProductWizard";
import { inferSegmentFromCategory } from "./productKindMap";
import { PageShell, PageHeader, PageLoading } from "../../components/shell";

const SEGMENT_TABS = [
  { id: "MEAT", label: "Meat counter", hint: "Raw beef, pork, liver…" },
  { id: "PREPARED", label: "Prepared", hint: "Plates, portions, cups…" },
  { id: "RETAIL", label: "Retail", hint: "Soda, water, packs…" },
  { id: "KITCHEN_SUPPLY", label: "Kitchen inputs", hint: "Salt, oil, sauces…" },
];

function defaultFormForSegment(segment) {
  const base = {
    name: "",
    pricePerUnit: "",
    wholesalePricePerUnit: "",
    salesPrompt: "",
    description: "",
    isActive: true,
    parentProductId: "",
    branchScope: "ALL",
  };
  if (segment === "MEAT") {
    return { ...base, unit: "kg", category: "RAW_STOCK", saleMode: "WEIGHT", segment: "MEAT" };
  }
  if (segment === "PREPARED") {
    return { ...base, unit: "portion", category: "PRODUCTION_ITEM", saleMode: "PORTION", segment: "PREPARED" };
  }
  if (segment === "RETAIL") {
    return { ...base, unit: "piece", category: "CONSUMABLE", saleMode: "PIECE", segment: "RETAIL" };
  }
  if (segment === "KITCHEN_SUPPLY") {
    return { ...base, unit: "piece", category: "CONSUMABLE", saleMode: "PIECE", segment: "KITCHEN_SUPPLY" };
  }
  return { ...base, unit: "kg", category: "RAW_STOCK", saleMode: "WEIGHT", segment: "MEAT" };
}

const defaultEnd = new Date();
const defaultStart = new Date();
defaultStart.setDate(defaultStart.getDate() - 365);

function formatBranchScope(scope) {
  if (scope === "GENERAL_BUTCHERY") return "General only";
  if (scope === "PORK_BUTCHERY") return "Pork only";
  return "All branches";
}

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
  const [activeSegment, setActiveSegment] = useState("MEAT");
  const [wizardLockedSegment, setWizardLockedSegment] = useState(null);
  const [filters, setFilters] = useState({
    dateFrom: defaultStart.toISOString().split("T")[0],
    dateTo: defaultEnd.toISOString().split("T")[0],
  });
  const [formData, setFormData] = useState({
    name: '',
    unit: 'kg',
    pricePerUnit: '',
    wholesalePricePerUnit: '',
    category: 'RAW_STOCK',
    saleMode: 'WEIGHT',
    salesPrompt: '',
    description: '',
    isActive: true,
    parentProductId: "",
    segment: "MEAT",
    branchScope: "ALL",
  });

  const filteredProducts = useMemo(() => {
    const byDate = filterByDateRange(products, filters.dateFrom, filters.dateTo);
    const seg = (p) => p.segment || inferSegmentFromCategory(p.category);
    return byDate.filter((p) => seg(p) === activeSegment);
  }, [products, filters.dateFrom, filters.dateTo, activeSegment]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.products.getAll();
      // Map defaultPrice to pricePerUnit for frontend display
      const products = (response.data || []).map((product) => ({
        ...product,
        pricePerUnit: product.defaultPrice || product.pricePerUnit || 0,
        segment: product.segment || inferSegmentFromCategory(product.category),
      }));
      setProducts(products);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (product = null) => {
    if (product) {
      setWizardLockedSegment(null);
      setEditingProduct(product);
      setFormData({
        name: product.name,
        unit: product.unit,
        pricePerUnit: (product.defaultPrice || product.pricePerUnit || 0).toString(),
        wholesalePricePerUnit: (product.wholesalePrice != null ? product.wholesalePrice : "").toString(),
        category: product.category || "RAW_STOCK",
        saleMode: product.saleMode || "WEIGHT",
        salesPrompt: product.salesPrompt || "",
        description: product.description || "",
        isActive: product.isActive,
        parentProductId: product.parentProductId ? product.parentProductId.toString() : "",
        segment: product.segment || inferSegmentFromCategory(product.category),
        branchScope: product.branchScope || "ALL",
      });
    } else {
      setWizardLockedSegment(activeSegment);
      setEditingProduct(null);
      setFormData(defaultFormForSegment(activeSegment));
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setWizardLockedSegment(null);
    setFormData(defaultFormForSegment(activeSegment));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const segment = formData.segment || inferSegmentFromCategory(formData.category);
    const isKitchenSupply = segment === "KITCHEN_SUPPLY";

    let price = parseFloat(formData.pricePerUnit);
    if (isKitchenSupply) {
      if (formData.pricePerUnit === "" || formData.pricePerUnit === undefined) {
        price = 0;
      } else if (isNaN(price) || price < 0) {
        toast.error("Optional cost must be 0 or greater");
        return;
      }
    } else if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid retail price greater than 0");
      return;
    }
    const wholesaleInput = formData.wholesalePricePerUnit ? parseFloat(formData.wholesalePricePerUnit) : null;
    if (wholesaleInput !== null && (isNaN(wholesaleInput) || wholesaleInput < 0)) {
      toast.error("Wholesale price must be 0 or greater");
      return;
    }
    // Every product has both: if wholesale left blank, use retail so wholesale sales always have a price
    const wholesalePrice = wholesaleInput !== null && !isNaN(wholesaleInput) ? wholesaleInput : price;
    try {
      const data = {
        name: formData.name.trim(),
        unit: formData.unit.trim(),
        defaultPrice: price,
        wholesalePrice,
        category: formData.category,
        saleMode: formData.saleMode,
        segment,
        salesPrompt: formData.salesPrompt?.trim() || undefined,
        isActive: formData.isActive,
        parentProductId: formData.parentProductId ? parseInt(formData.parentProductId) : undefined,
        branchScope: formData.branchScope || "ALL",
      };

      if (editingProduct) {
        await apiClient.products.update(editingProduct.id, data);
        toast.success(isKitchenSupply ? "Kitchen item updated" : "Product updated successfully");
      } else {
        await apiClient.products.create(data);
        toast.success(isKitchenSupply ? "Kitchen item added" : "Product created successfully");
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
      const { data } = await apiClient.products.delete(id);
      if (data?.deleted === false) {
        toast.info(data.message);
      } else {
        toast.success("Product deleted successfully");
      }
      loadProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete product");
    }
  };

  const handleToggleActive = async (product) => {
    try {
      await apiClient.products.update(product.id, {
        name: product.name,
        unit: product.unit,
        defaultPrice: product.defaultPrice || product.pricePerUnit || 0,
        wholesalePrice: product.wholesalePrice ?? undefined,
        category: product.category || "RAW_STOCK",
        saleMode: product.saleMode || "WEIGHT",
        segment: product.segment || inferSegmentFromCategory(product.category),
        salesPrompt: product.salesPrompt || undefined,
        branchScope: product.branchScope || "ALL",
        isActive: !product.isActive,
      });
      toast.success(`Product ${product.isActive ? 'deactivated' : 'activated'} successfully`);
      loadProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update product");
    }
  };

  if (loading) {
    return (
      <PageShell>
        <PageLoading message="Loading products…" />
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-4 sm:space-y-8">
      <PageHeader title="Products Management" subtitle="Work by area — meat, prepared plates, retail, or kitchen inputs.">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              const rows = filteredProducts.map((p) => ({
                name: p.name,
                unit: p.unit,
                pricePerUnit: parseFloat(p.defaultPrice || p.pricePerUnit || 0),
                segment: p.segment || inferSegmentFromCategory(p.category),
                branchScope: formatBranchScope(p.branchScope),
                category: p.category || "",
                saleMode: p.saleMode || "",
                salesPrompt: p.salesPrompt || "",
                status: p.isActive ? "Active" : "Inactive",
                createdAt: p.createdAt ? new Date(p.createdAt).toLocaleString() : "",
              }));
              exportToExcel(
                rows,
                [
                  { key: "name", label: "Name" },
                  { key: "unit", label: "Unit" },
                  { key: "pricePerUnit", label: "Price (KES)" },
                  { key: "segment", label: "Segment" },
                  { key: "branchScope", label: "Branch scope" },
                  { key: "category", label: "Category" },
                  { key: "saleMode", label: "Sale Mode" },
                  { key: "salesPrompt", label: "Sales Prompt" },
                  { key: "status", label: "Status" },
                  { key: "createdAt", label: "Created" },
                ],
                `products-${activeSegment}-${new Date().toISOString().split("T")[0]}`
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
            Add in this tab
          </button>
        </div>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {SEGMENT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSegment(tab.id)}
            className={`min-h-[48px] rounded-xl border-2 px-4 py-2 text-left text-sm font-semibold transition-colors sm:min-w-[160px] ${
              activeSegment === tab.id
                ? "border-blue-900 bg-blue-900 text-white shadow-sm"
                : "border-gray-200 bg-white text-gray-800 hover:border-gray-300"
            }`}
          >
            <span className="block">{tab.label}</span>
            <span
              className={`mt-0.5 block text-xs font-normal ${
                activeSegment === tab.id ? "text-blue-100" : "text-gray-500"
              }`}
            >
              {tab.hint}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/40 text-base min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/40 text-base min-h-[44px]"
            />
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Retail (KES)</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Wholesale (KES)</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Segment</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Branches</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Category</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Sale Mode</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 sm:px-6 py-4 text-center text-gray-500">
                    No products in this tab. Add one or switch segment.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.unit}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 hidden sm:table-cell">
                      KES {parseFloat(product.defaultPrice || product.pricePerUnit || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">
                      {product.wholesalePrice != null ? `KES ${parseFloat(product.wholesalePrice).toLocaleString('en-KE', { minimumFractionDigits: 2 })}` : '–'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 hidden lg:table-cell">
                      {(product.segment || inferSegmentFromCategory(product.category))?.replace(/_/g, " ") || "—"}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 hidden lg:table-cell">
                      {formatBranchScope(product.branchScope)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                      {product.category?.replace(/_/g, " ") || "-"}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                      {product.saleMode?.replace(/_/g, ' ') || '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        product.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-col sm:flex-row gap-2">
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleOpenModal(product)}
                              className="text-blue-600 hover:text-blue-800 min-h-[44px] sm:min-h-0 text-left sm:text-left"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleActive(product)}
                              className="text-yellow-600 hover:text-yellow-800 min-h-[44px] sm:min-h-0 text-left sm:text-left"
                            >
                              {product.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="text-red-600 hover:text-red-800 min-h-[44px] sm:min-h-0 text-left sm:text-left"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {!isAdmin && <span className="text-gray-400 text-sm">View only</span>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 sm:p-6 w-full max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
              {wizardLockedSegment === "KITCHEN_SUPPLY" || formData.segment === "KITCHEN_SUPPLY"
                ? editingProduct
                  ? "Edit kitchen item"
                  : "Add kitchen supply"
                : editingProduct
                  ? "Edit product"
                  : "Add product"}
            </h2>
            <p className="text-xs text-gray-600 mb-4">
              {wizardLockedSegment === "KITCHEN_SUPPLY" || formData.segment === "KITCHEN_SUPPLY"
                ? editingProduct
                  ? "Name, unit, and optional internal cost. Issued to the kitchen from Stock — not sold on the till."
                  : "Track salt, oil, sauces, and other inputs. Quantities live under Stock → Kitchen supplies."
                : editingProduct
                  ? "Update prices, units, or prompts — advanced settings stay available below."
                  : "Choose a type, then name and price. Optional: parent product and till prompts."}
            </p>
            <ProductWizard
              formData={formData}
              setFormData={setFormData}
              products={products}
              editingProduct={editingProduct}
              onSubmit={handleSubmit}
              onCancel={handleCloseModal}
              lockedSegment={wizardLockedSegment}
            />
          </div>
        </div>
      )}
    </PageShell>
  );
}


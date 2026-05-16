"use client";
import { useState, useEffect, useMemo } from "react";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";
import { exportToExcel } from "../../../../lib/exportExcel";
import { useAuth } from "../../../../contexts/AuthContext";
import {
  customerIsWholesale,
  customerHasCredit,
  customerCategoryLabel,
} from "../../../../lib/customerFlags";

import { defaultDateRangeYmd, todayYmd } from "../../../../lib/time";

const { dateFrom: defaultDateFrom, dateTo: defaultDateTo } = defaultDateRangeYmd(365);

const TABS = [
  { id: "regular", label: "Regular" },
  { id: "wholesale", label: "Wholesale" },
];

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

export default function CustomersPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState("regular");
  const [filters, setFilters] = useState({
    dateFrom: defaultDateFrom,
    dateTo: defaultDateTo,
  });
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    isWholesale: false,
    creditEnabled: false,
    creditLimit: "",
    paymentTerms: "",
    notes: "",
    isActive: true,
  });

  const filteredCustomers = useMemo(
    () => filterByDateRange(customers, filters.dateFrom, filters.dateTo),
    [customers, filters.dateFrom, filters.dateTo]
  );

  useEffect(() => {
    loadCustomers();
  }, [activeTab]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params = {
        activeOnly: false,
        isWholesale: activeTab === "wholesale" ? "true" : "false",
      };
      const response = await apiClient.customers.getAll(params);
      setCustomers(response.data || []);
    } catch (error) {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
        isWholesale: customerIsWholesale(customer),
        creditEnabled: customerHasCredit(customer),
        creditLimit: customer.creditLimit || "",
        paymentTerms: customer.paymentTerms || "",
        notes: customer.notes || "",
        isActive: customer.isActive !== undefined ? customer.isActive : true,
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: "",
        phone: "",
        email: "",
        address: "",
        isWholesale: activeTab === "wholesale",
        creditEnabled: false,
        creditLimit: "",
        paymentTerms: "",
        notes: "",
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        isWholesale: !!formData.isWholesale,
        creditEnabled: !!formData.creditEnabled,
        creditLimit:
          formData.creditEnabled && formData.creditLimit
            ? parseFloat(formData.creditLimit)
            : null,
        paymentTerms: formData.creditEnabled ? formData.paymentTerms || null : null,
        notes: formData.notes || null,
        isActive: formData.isActive,
        type: formData.isWholesale ? "WHOLESALE" : "REGULAR",
      };
      if (editingCustomer) {
        await apiClient.customers.update(editingCustomer.id, data);
        toast.success("Customer updated successfully");
      } else {
        await apiClient.customers.create(data);
        toast.success("Customer created successfully");
      }
      setShowModal(false);
      loadCustomers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save customer");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    try {
      await apiClient.customers.delete(id);
      toast.success("Customer deleted successfully");
      loadCustomers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete customer");
    }
  };

  if (loading) {
    return <div className="p-6">Loading customers...</div>;
  }

  return (
    <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">
            Regular or wholesale customers — credit can be enabled on either type
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const rows = filteredCustomers.map((c) => ({
                name: c.name,
                category: customerCategoryLabel(c),
                credit: customerHasCredit(c) ? "Yes" : "No",
                phone: c.phone || "",
                email: c.email || "",
                address: c.address || "",
                creditLimit:
                  customerHasCredit(c) && c.creditLimit
                    ? parseFloat(c.creditLimit)
                    : "",
                status: c.isActive ? "Active" : "Inactive",
                createdAt: c.createdAt ? new Date(c.createdAt).toLocaleString() : "",
              }));
              exportToExcel(
                rows,
                [
                  { key: "name", label: "Name" },
                  { key: "category", label: "Category" },
                  { key: "credit", label: "Credit" },
                  { key: "phone", label: "Phone" },
                  { key: "email", label: "Email" },
                  { key: "address", label: "Address" },
                  { key: "creditLimit", label: "Credit Limit (KES)" },
                  { key: "status", label: "Status" },
                  { key: "createdAt", label: "Created" },
                ],
                `customers-${activeTab}-${todayYmd()}`
              );
              toast.success("Excel exported");
            }}
            className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 text-sm font-medium min-h-[44px]"
          >
            Export Excel
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors text-sm"
          >
            Add Customer
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 px-4 pt-2">
          <nav className="flex gap-1" aria-label="Customer category">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-900 text-blue-900"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <p className="text-xs text-gray-500 pb-3 px-1">
            {activeTab === "wholesale"
              ? "Wholesale pricing. Enable credit below when adding or editing a customer."
              : "Walk-in and retail accounts. Enable credit for trusted regular customers."}
          </p>
        </div>

        <div className="p-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Credit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Credit limit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No {activeTab} customers in this date range
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const wholesale = customerIsWholesale(customer);
                  const credit = customerHasCredit(customer);
                  return (
                    <tr key={customer.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {customer.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            wholesale
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {wholesale ? "Wholesale" : "Regular"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {credit ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            On credit
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.phone || customer.email || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {credit && customer.creditLimit
                          ? `KES ${parseFloat(customer.creditLimit).toLocaleString("en-KE", {
                              minimumFractionDigits: 2,
                            })}`
                          : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            customer.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {customer.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isAdmin ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenModal(customer)}
                              className="text-blue-600 hover:text-blue-800 mr-4"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(customer.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <span className="text-gray-400 text-sm">View only</span>
                        )}
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
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-1">
              {editingCustomer ? "Edit Customer" : "Add Customer"}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Choose regular or wholesale, then optionally enable a credit account.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows="2"
                />
              </div>

              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">Customer type *</span>
                <div className="inline-flex rounded-lg border border-gray-300 p-0.5 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isWholesale: false })}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      !formData.isWholesale
                        ? "bg-white text-blue-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Regular
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isWholesale: true })}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      formData.isWholesale
                        ? "bg-white text-purple-800 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Wholesale
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4 space-y-3 bg-gray-50/80">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={formData.creditEnabled}
                    onChange={(e) =>
                      setFormData({ ...formData, creditEnabled: e.target.checked })
                    }
                  />
                  <span>
                    <span className="text-sm font-medium text-gray-900 block">
                      Credit account
                    </span>
                    <span className="text-xs text-gray-500">
                      Allow this {formData.isWholesale ? "wholesale" : "regular"} customer to buy
                      on credit (limit required).
                    </span>
                  </span>
                </label>
                {formData.creditEnabled && (
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Credit limit (KES) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.creditLimit}
                        onChange={(e) =>
                          setFormData({ ...formData, creditLimit: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment terms
                      </label>
                      <input
                        type="text"
                        value={formData.paymentTerms}
                        onChange={(e) =>
                          setFormData({ ...formData, paymentTerms: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                        placeholder="e.g. Net 30"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows="2"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5]"
                >
                  {editingCustomer ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

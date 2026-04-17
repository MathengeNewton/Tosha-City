"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { apiClient } from "../../../../lib/api";
import { PageShell, PageHeader, PageLoading } from "../../components/shell";

const BRANCH_TYPES = [
  { value: "GENERAL_BUTCHERY", label: "General butchery" },
  { value: "PORK_BUTCHERY", label: "Pork butchery" },
];

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "GENERAL_BUTCHERY",
    isActive: true,
  });

  const sortedBranches = useMemo(
    () => [...branches].sort((a, b) => a.name.localeCompare(b.name)),
    [branches]
  );

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const response = await apiClient.branches.getAll();
      setBranches(response.data || []);
    } catch (error) {
      console.error("Error loading branches:", error);
      toast.error("Failed to load branches");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingBranch(null);
    setFormData({
      name: "",
      code: "",
      type: "GENERAL_BUTCHERY",
      isActive: true,
    });
    setShowModal(true);
  };

  const openEdit = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name || "",
      code: branch.code || "",
      type: branch.type || "GENERAL_BUTCHERY",
      isActive: branch.isActive !== false,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBranch(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        type: formData.type,
        isActive: formData.isActive,
      };

      if (editingBranch) {
        await apiClient.branches.update(editingBranch.id, payload);
        toast.success("Branch updated successfully");
      } else {
        await apiClient.branches.create(payload);
        toast.success("Branch created successfully");
      }

      closeModal();
      loadBranches();
    } catch (error) {
      console.error("Error saving branch:", error);
      toast.error(error.response?.data?.message || "Failed to save branch");
    }
  };

  const handleDelete = async (branchId) => {
    if (!confirm("Delete this branch?")) return;
    try {
      await apiClient.branches.delete(branchId);
      toast.success("Branch deleted successfully");
      loadBranches();
    } catch (error) {
      console.error("Error deleting branch:", error);
      toast.error(error.response?.data?.message || "Failed to delete branch");
    }
  };

  if (loading) {
    return (
      <PageShell>
        <PageLoading message="Loading branches…" />
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-8">
      <PageHeader title="Branches" subtitle="Create branches and assign staff to them.">
        <button
          type="button"
          onClick={openCreate}
          className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors text-sm min-h-[44px]"
        >
          Add Branch
        </button>
      </PageHeader>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedBranches.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No branches found.
                  </td>
                </tr>
              ) : (
                sortedBranches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{branch.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{branch.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {branch.type === "PORK_BUTCHERY" ? "Pork butchery" : "General butchery"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${branch.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                        {branch.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                      <button onClick={() => openEdit(branch)} className="text-indigo-600 hover:text-indigo-900">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(branch.id)} className="text-red-600 hover:text-red-900">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingBranch ? "Edit Branch" : "Create Branch"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {BRANCH_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                Active
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5]"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}

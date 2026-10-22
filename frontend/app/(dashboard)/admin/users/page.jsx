"use client";
import { useState, useEffect, useMemo } from "react";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";
import { exportToExcel } from "../../../../lib/exportExcel";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { PageShell, PageHeader, PageLoading } from "../../components/shell";

const defaultEnd = new Date();
const defaultStart = new Date();
defaultStart.setDate(defaultStart.getDate() - 365);

/** Only these roles can be assigned in the UI (matches product roles). */
const ASSIGNABLE_ROLE_NAMES = new Set(["admin", "cashier"]);
const MIN_PASSWORD_LENGTH = 6;

function validateUserForm(formData, { isEdit, requiresBranch }) {
  const errors = {};
  if (!formData.username.trim()) {
    errors.username = "Enter a username.";
  }
  if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!isEdit && !formData.password) {
    errors.password = `Enter a password of at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (formData.password && formData.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters. You entered ${formData.password.length}.`;
  }
  if (formData.roleIds.length === 0) {
    errors.roles = "Select at least one role.";
  }
  if (requiresBranch && !formData.branchId) {
    errors.branchId = "Select a branch. Non-admin users must belong to one branch.";
  }
  return errors;
}

function apiErrorText(error) {
  const message = error?.response?.data?.message;
  const parts = Array.isArray(message) ? message : message ? [String(message)] : [];
  const text = parts
    .map((part) => {
      if (/password must be longer/i.test(part)) {
        return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
      }
      if (/email must be an email/i.test(part)) {
        return "Enter a valid email address.";
      }
      if (/username should not be empty|username must be a string/i.test(part)) {
        return "Enter a username.";
      }
      return part;
    })
    .filter((part) => part && part !== "Internal server error")
    .join(" ");
  return text || "Could not save this user. Check the form and try again.";
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

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [filters, setFilters] = useState({
    dateFrom: defaultStart.toISOString().split("T")[0],
    dateTo: defaultEnd.toISOString().split("T")[0],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    roleIds: [],
    branchId: "",
  });

  const cashierRole = useMemo(
    () => roles.find((r) => r.name?.toLowerCase() === "cashier"),
    [roles]
  );

  const assignableRoles = useMemo(() => {
    const filtered = roles.filter((role) =>
      ASSIGNABLE_ROLE_NAMES.has(role.name?.toLowerCase())
    );
    const order = { admin: 0, cashier: 1 };
    return [...filtered].sort(
      (a, b) =>
        (order[a.name?.toLowerCase()] ?? 99) - (order[b.name?.toLowerCase()] ?? 99)
    );
  }, [roles]);

  const filteredUsers = useMemo(
    () => filterByDateRange(users, filters.dateFrom, filters.dateTo),
    [users, filters.dateFrom, filters.dateTo]
  );

  useEffect(() => {
    loadUsers();
    loadRoles();
    loadBranches();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.users.getAll();
      setUsers(response.data || []);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await apiClient.roles.getAll();
      setRoles(response.data || []);
    } catch (error) {
      console.error("Error loading roles:", error);
      toast.error("Failed to load roles");
    }
  };

  const loadBranches = async () => {
    try {
      const response = await apiClient.branches.getAll({ activeOnly: true });
      setBranches(response.data || []);
    } catch (error) {
      console.error("Error loading branches:", error);
      toast.error("Failed to load branches");
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      username: "",
      email: "",
      password: "",
      roleIds: cashierRole ? [cashierRole.id] : [],
      branchId: "",
    });
    setShowPassword(false);
    setFieldErrors({});
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username || "",
      email: user.email || "",
      password: "",
      roleIds:
        user.roles
          ?.filter((role) => ASSIGNABLE_ROLE_NAMES.has(role.name?.toLowerCase()))
          .map((role) => role.id) || [],
      branchId: user.branchId ? String(user.branchId) : "",
    });
    setShowPassword(false);
    setFieldErrors({});
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      await apiClient.users.delete(id);
      toast.success("User deleted successfully");
      loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!roles.length) {
      const message = "Roles are still loading. Wait a moment and try again.";
      setFieldErrors({ roles: message });
      toast.error(message);
      return;
    }

    const errors = validateUserForm(formData, {
      isEdit: Boolean(editingUser),
      requiresBranch: !selectedRolesIncludeAdmin,
    });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error(Object.values(errors)[0]);
      return;
    }
    setFieldErrors({});

    try {
      const userData = {
        username: formData.username,
        email: formData.email,
        roleIds: formData.roleIds,
        branchId: formData.branchId ? parseInt(formData.branchId, 10) : undefined,
      };

      // Only include password if it's a new user or if password was changed
      if (!editingUser || formData.password) {
        userData.password = formData.password;
      }

      if (editingUser) {
        await apiClient.users.update(editingUser.id, userData);
        toast.success("User updated successfully");
      } else {
        await apiClient.users.create(userData);
        toast.success("User created successfully");
      }
      setShowModal(false);
      loadUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      const message = apiErrorText(error);
      const nextErrors = {};
      if (/password/i.test(message)) nextErrors.password = message;
      if (/email/i.test(message)) nextErrors.email = message;
      if (/username/i.test(message)) nextErrors.username = message;
      if (/branch/i.test(message)) nextErrors.branchId = message;
      if (/role/i.test(message)) nextErrors.roles = message;
      if (Object.keys(nextErrors).length === 0) nextErrors.form = message;
      setFieldErrors(nextErrors);
      toast.error(message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setFieldErrors((prev) => {
      if (!prev[name] && !prev.form) return prev;
      const next = { ...prev };
      delete next[name];
      delete next.form;
      return next;
    });
  };

  const handleRoleToggle = (roleId) => {
    setFormData((prev) => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter((id) => id !== roleId)
        : [...prev.roleIds, roleId],
    }));
    setFieldErrors((prev) => {
      if (!prev.roles && !prev.form) return prev;
      const next = { ...prev };
      delete next.roles;
      delete next.form;
      return next;
    });
  };

  const getUserRoles = (user) => {
    const assignable =
      user.roles?.filter((role) =>
        ASSIGNABLE_ROLE_NAMES.has(role.name?.toLowerCase())
      ) || [];
    const legacy =
      user.roles?.filter(
        (role) => !ASSIGNABLE_ROLE_NAMES.has(role.name?.toLowerCase())
      ) || [];
    const main = assignable.map((role) => role.name).join(", ");
    if (legacy.length) {
      const legacyStr = legacy.map((role) => role.name).join(", ");
      return main ? `${main} · legacy: ${legacyStr}` : `legacy: ${legacyStr}`;
    }
    return main || "No roles";
  };

  const selectedRoles = assignableRoles.filter((role) => formData.roleIds.includes(role.id));
  const selectedRolesIncludeAdmin = selectedRoles.some((role) => role.name?.toLowerCase() === "admin");

  if (loading) {
    return (
      <PageShell>
        <PageLoading message="Loading users…" />
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-8">
      <PageHeader title="Users Management" subtitle="Manage users and roles" />

      {/* Filter Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0D47A1]/40"
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">User List</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const rows = filteredUsers.map((u) => ({
                  username: u.username,
                  email: u.email || "",
                  roles: getUserRoles(u),
                  branch: u.branch?.name || "",
                }));
                exportToExcel(
                  rows,
                  [
                    { key: "username", label: "Username" },
                    { key: "email", label: "Email" },
                    { key: "roles", label: "Roles" },
                    { key: "branch", label: "Branch" },
                  ],
                  `users-export-${new Date().toISOString().split("T")[0]}`
                );
                toast.success("Excel exported");
              }}
              className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 text-sm font-medium min-h-[44px]"
            >
              Export Excel
            </button>
            <button
              onClick={handleCreate}
              className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors text-sm"
            >
              Create User
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getUserRoles(user)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.branch?.name || "Global"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingUser ? "Edit User" : "Create User"}
            </h3>
            <form onSubmit={handleSubmit} noValidate>
              {fieldErrors.form && (
                <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {fieldErrors.form}
                </p>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Username"
                  aria-invalid={Boolean(fieldErrors.username)}
                  className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent ${
                    fieldErrors.username ? "border-red-500" : ""
                  }`}
                />
                {fieldErrors.username && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.username}</p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent ${
                    fieldErrors.email ? "border-red-500" : ""
                  }`}
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editingUser ? "(leave blank to keep current)" : "*"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 6 characters"
                    aria-invalid={Boolean(fieldErrors.password)}
                    className={`w-full p-2 pr-10 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent ${
                      fieldErrors.password ? "border-red-500" : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className={`mt-1 text-sm ${fieldErrors.password ? "text-red-600" : "text-gray-500"}`}>
                  {fieldErrors.password || "Use at least 6 characters."}
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Roles *
                </label>
                <div className="space-y-2">
                  {assignableRoles.map((role) => (
                    <label key={role.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.roleIds.includes(role.id)}
                        onChange={() => handleRoleToggle(role.id)}
                        className="mr-2"
                      />
                      <span className="text-sm capitalize">{role.name}</span>
                    </label>
                  ))}
                </div>
                {fieldErrors.roles && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.roles}</p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch {!selectedRolesIncludeAdmin ? "*" : "(optional for admins)"}
                </label>
                <select
                  name="branchId"
                  value={formData.branchId}
                  onChange={handleChange}
                  aria-invalid={Boolean(fieldErrors.branchId)}
                  className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent ${
                    fieldErrors.branchId ? "border-red-500" : ""
                  }`}
                >
                  <option value="">{selectedRolesIncludeAdmin ? "No branch (global)" : "Select branch"}</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} ({branch.type === "PORK_BUTCHERY" ? "Pork" : "General"})
                    </option>
                  ))}
                </select>
                {fieldErrors.branchId ? (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.branchId}</p>
                ) : !selectedRolesIncludeAdmin ? (
                  <p className="mt-1 text-xs text-gray-500">Non-admin users must belong to one branch.</p>
                ) : null}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
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
};

export default UsersPage;

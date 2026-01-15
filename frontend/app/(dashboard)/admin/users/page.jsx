"use client";
import { useState, useEffect } from "react";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    districtId: "",
    roleIds: [],
  });

  useEffect(() => {
    loadUsers();
    loadDistricts();
    loadRoles();
  }, [selectedDistrictFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = selectedDistrictFilter ? { districtId: selectedDistrictFilter } : {};
      const response = await apiClient.users.getAll(params);
      setUsers(response.data || []);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const loadDistricts = async () => {
    try {
      const response = await apiClient.districts.getAll();
      setDistricts(response.data || []);
    } catch (error) {
      console.error("Error loading districts:", error);
      toast.error("Failed to load districts");
    }
  };

  const loadRoles = async () => {
    // Note: You may need to add a roles endpoint to your API
    // For now, we'll use common roles
    setRoles([
      { id: 1, name: "admin" },
      { id: 2, name: "member" },
      { id: 3, name: "group-leader" },
    ]);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      username: "",
      email: "",
      password: "",
      districtId: "",
      roleIds: [],
    });
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username || "",
      email: user.email || "",
      password: "", // Don't pre-fill password
      districtId: user.districtId || user.district?.id || "",
      roleIds: user.roles?.map((r) => r.id) || [],
    });
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
    
    if (!formData.districtId) {
      toast.error("Please select a district");
      return;
    }

    try {
      const userData = {
        username: formData.username,
        email: formData.email,
        districtId: parseInt(formData.districtId),
        roleIds: formData.roleIds,
      };

      // Only include password if it's a new user or if password was changed
      if (!editingUser || formData.password) {
        userData.password = formData.password;
      }

      if (editingUser) {
        await apiClient.users.update(editingUser.id, userData);
        toast.success("User updated successfully");
      } else {
        if (!userData.password) {
          toast.error("Password is required for new users");
          return;
        }
        await apiClient.users.create(userData);
        toast.success("User created successfully");
      }
      setShowModal(false);
      loadUsers();
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error(error.response?.data?.message || "Failed to save user");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleRoleToggle = (roleId) => {
    setFormData((prev) => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter((id) => id !== roleId)
        : [...prev.roleIds, roleId],
    }));
  };

  const getUserDistrict = (user) => {
    return districts.find((d) => d.id === user.districtId);
  };

  const getUserRoles = (user) => {
    return user.roles?.map((r) => r.name).join(", ") || "No roles";
  };

  const isDistrictLeader = (user, district) => {
    return district?.leaderIds?.includes(user.id) || false;
  };

  if (loading) {
    return (
      <div className="w-full space-y-8 bg-gray-50 min-h-screen p-6 flex items-center justify-center">
        <div className="text-gray-600">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 bg-gray-50 min-h-screen p-6">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          Users Management
        </h1>
        <p className="text-gray-600 mt-1">
          Manage PCEA church users and roles
        </p>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Filter by District:
          </label>
          <select
            value={selectedDistrictFilter}
            onChange={(e) => setSelectedDistrictFilter(e.target.value)}
            className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
          >
            <option value="">All Districts</option>
            {districts.map((district) => (
              <option key={district.id} value={district.id}>
                {district.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">User List</h3>
          <button
            onClick={handleCreate}
            className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors"
          >
            Create User
          </button>
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
                  District
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Leader
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const district = getUserDistrict(user);
                  const isLeader = isDistrictLeader(user, district);
                  return (
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
                        {district?.name || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isLeader ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            Leader
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingUser ? "Edit User" : "Create User"}
            </h3>
            <form onSubmit={handleSubmit}>
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
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editingUser ? "(leave blank to keep current)" : "*"}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  required={!editingUser}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  District *
                </label>
                <select
                  name="districtId"
                  value={formData.districtId}
                  onChange={handleChange}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  required
                >
                  <option value="">Select District</option>
                  {districts.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Roles *
                </label>
                <div className="space-y-2">
                  {roles.map((role) => (
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
    </div>
  );
};

export default UsersPage;

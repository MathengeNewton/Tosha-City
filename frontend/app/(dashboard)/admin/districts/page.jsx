"use client";
import { useState, useEffect } from "react";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";

const DistrictsPage = () => {
  const [districts, setDistricts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLeadersModal, setShowLeadersModal] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
  });

  useEffect(() => {
    loadDistricts();
    loadUsers();
  }, []);

  const loadDistricts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.districts.getAll();
      setDistricts(response.data || []);
    } catch (error) {
      console.error("Error loading districts:", error);
      toast.error("Failed to load districts");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiClient.users.getAll();
      setUsers(response.data || []);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleCreate = () => {
    setEditingDistrict(null);
    setFormData({ name: "", code: "", description: "" });
    setShowModal(true);
  };

  const handleEdit = (district) => {
    setEditingDistrict(district);
    setFormData({
      name: district.name || "",
      code: district.code || "",
      description: district.description || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this district?")) return;

    try {
      await apiClient.districts.delete(id);
      toast.success("District deleted successfully");
      loadDistricts();
    } catch (error) {
      console.error("Error deleting district:", error);
      toast.error("Failed to delete district");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDistrict) {
        await apiClient.districts.update(editingDistrict.id, formData);
        toast.success("District updated successfully");
      } else {
        await apiClient.districts.create(formData);
        toast.success("District created successfully");
      }
      setShowModal(false);
      loadDistricts();
    } catch (error) {
      console.error("Error saving district:", error);
      toast.error(error.response?.data?.message || "Failed to save district");
    }
  };

  const handleManageLeaders = async (district) => {
    try {
      const response = await apiClient.districts.getById(district.id);
      setSelectedDistrict(response.data);
      setShowLeadersModal(true);
    } catch (error) {
      console.error("Error loading district:", error);
      toast.error("Failed to load district details");
    }
  };

  const handleAssignLeaders = async (userIds) => {
    if (!selectedDistrict) return;

    try {
      await apiClient.districts.assignLeaders(selectedDistrict.id, userIds);
      toast.success("Leaders assigned successfully");
      loadDistricts();
      const response = await apiClient.districts.getById(selectedDistrict.id);
      setSelectedDistrict(response.data);
    } catch (error) {
      console.error("Error assigning leaders:", error);
      toast.error(error.response?.data?.message || "Failed to assign leaders");
    }
  };

  const handleRemoveLeader = async (userId) => {
    if (!selectedDistrict) return;

    try {
      await apiClient.districts.removeLeader(selectedDistrict.id, userId);
      toast.success("Leader removed successfully");
      loadDistricts();
      const response = await apiClient.districts.getById(selectedDistrict.id);
      setSelectedDistrict(response.data);
    } catch (error) {
      console.error("Error removing leader:", error);
      toast.error("Failed to remove leader");
    }
  };

  const getLeaderNames = (district) => {
    if (!district.leaderIds || district.leaderIds.length === 0) return "None";
    const leaders = users.filter((u) => district.leaderIds.includes(u.id));
    return leaders.map((l) => l.username || l.email).join(", ") || "None";
  };

  const getDistrictMembers = (district) => {
    return users.filter((u) => u.districtId === district.id);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (loading) {
    return (
      <div className="w-full space-y-8 bg-gray-50 min-h-screen p-6 flex items-center justify-center">
        <div className="text-gray-600">Loading districts...</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 bg-gray-50 min-h-screen p-6">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          Districts Management
        </h1>
        <p className="text-gray-600 mt-1">
          Manage PCEA districts and district leadership
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">District List</h3>
          <button
            onClick={handleCreate}
            className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors"
          >
            Create District
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  District
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Members
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Leaders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {districts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No districts found. Create your first district.
                  </td>
                </tr>
              ) : (
                districts.map((district) => (
                  <tr key={district.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {district.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {district.code || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {district.description || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {district.memberCount || getDistrictMembers(district).length}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <span className="max-w-xs truncate block" title={getLeaderNames(district)}>
                        {getLeaderNames(district)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(district)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleManageLeaders(district)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Leaders
                      </button>
                      <button
                        onClick={() => handleDelete(district.id)}
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
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingDistrict ? "Edit District" : "Create District"}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  District Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="District Name"
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="District Code (optional)"
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="District Description (optional)"
                  rows="3"
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                />
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

      {/* Leadership Management Modal */}
      {showLeadersModal && selectedDistrict && (
        <LeadershipModal
          district={selectedDistrict}
          users={users}
          districtMembers={getDistrictMembers(selectedDistrict)}
          onAssignLeaders={handleAssignLeaders}
          onRemoveLeader={handleRemoveLeader}
          onClose={() => {
            setShowLeadersModal(false);
            setSelectedDistrict(null);
          }}
        />
      )}
    </div>
  );
};

// Leadership Management Modal Component
const LeadershipModal = ({
  district,
  users,
  districtMembers,
  onAssignLeaders,
  onRemoveLeader,
  onClose,
}) => {
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  const currentLeaders = users.filter((u) =>
    district.leaderIds?.includes(u.id)
  );

  const handleToggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAssign = () => {
    if (selectedUserIds.length === 0) {
      alert("Please select at least one user");
      return;
    }
    onAssignLeaders(selectedUserIds);
    setSelectedUserIds([]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Manage Leaders - {district.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Current Leaders */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-700 mb-2">Current Leaders</h4>
          {currentLeaders.length === 0 ? (
            <p className="text-gray-500 text-sm">No leaders assigned</p>
          ) : (
            <div className="space-y-2">
              {currentLeaders.map((leader) => (
                <div
                  key={leader.id}
                  className="flex justify-between items-center p-2 bg-gray-50 rounded"
                >
                  <span className="text-sm">
                    {leader.username || leader.email}
                  </span>
                  <button
                    onClick={() => onRemoveLeader(leader.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assign New Leaders */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-700 mb-2">
            Assign New Leaders (from district members)
          </h4>
          {districtMembers.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No members in this district yet
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {districtMembers
                .filter((m) => !district.leaderIds?.includes(m.id))
                .map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(member.id)}
                      onChange={() => handleToggleUser(member.id)}
                      className="mr-2"
                    />
                    <span className="text-sm">
                      {member.username || member.email}
                    </span>
                  </label>
                ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-50"
          >
            Close
          </button>
          {selectedUserIds.length > 0 && (
            <button
              onClick={handleAssign}
              className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5]"
            >
              Assign Selected ({selectedUserIds.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DistrictsPage;


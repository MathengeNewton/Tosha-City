// app/(dashboard)/admin/regions/page.jsx
// Regions page: List of regions with additional info (e.g., description, contact person), members from that region.
// CRUD operations: create, edit, delete with modal.
// Mock data. Table with more than 2 columns: Region, Description, Contact Person, Members, Actions.
// Updated for one parish: members from different regions like Ruiru, Mombasa Road, etc.

"use client";
import { useState } from "react";

const mockRegions = [
  {
    id: 1,
    name: "Ruiru",
    description: "Suburban area north of Nairobi",
    contact: "John Kamau",
    members: 500,
  },
  {
    id: 2,
    name: "Mombasa Road",
    description: "Industrial and residential zone",
    contact: "Mary Wanjiku",
    members: 300,
  },
  {
    id: 3,
    name: "Kiambu",
    description: "Agricultural region nearby",
    contact: "Peter Mutua",
    members: 400,
  },
  {
    id: 4,
    name: "Thika Road",
    description: "Busy highway corridor",
    contact: "Anne Njeri",
    members: 250,
  },
  {
    id: 5,
    name: "Nairobi CBD",
    description: "Central business district",
    contact: "David Ochieng",
    members: 600,
  },
];

const RegionsPage = () => {
  const [regions, setRegions] = useState(mockRegions);
  const [showModal, setShowModal] = useState(false);
  const [editingRegion, setEditingRegion] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    contact: "",
    members: 0,
  });

  const handleCreate = () => {
    setEditingRegion(null);
    setFormData({ name: "", description: "", contact: "", members: 0 });
    setShowModal(true);
  };

  const handleEdit = (region) => {
    setEditingRegion(region);
    setFormData(region);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setRegions(regions.filter((r) => r.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingRegion) {
      setRegions(
        regions.map((r) =>
          r.id === editingRegion.id ? { ...r, ...formData } : r
        )
      );
    } else {
      setRegions([...regions, { id: regions.length + 1, ...formData }]);
    }
    setShowModal(false);
  };

  const handleChange = (e) => {
    const value =
      e.target.name === "members"
        ? parseInt(e.target.value) || 0
        : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  return (
    <div className="w-full space-y-8 bg-gray-50 min-h-screen p-6">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          Regions Management
        </h1>
        <p className="text-gray-600 mt-1">
          Manage PCEA regions and member origins
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Region List</h3>
          <button
            onClick={handleCreate}
            className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5]"
          >
            Create Region
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Region
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Person
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Members
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {regions.map((region) => (
                <tr key={region.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {region.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {region.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {region.contact}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {region.members.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(region)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(region.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-96">
            <h3 className="text-lg font-semibold mb-4">
              {editingRegion ? "Edit Region" : "Create Region"}
            </h3>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Region Name"
                className="w-full p-2 border rounded mb-2"
                required
              />
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Description"
                className="w-full p-2 border rounded mb-2"
                required
              />
              <input
                type="text"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                placeholder="Contact Person"
                className="w-full p-2 border rounded mb-2"
                required
              />
              <input
                type="number"
                name="members"
                value={formData.members}
                onChange={handleChange}
                placeholder="Number of Members"
                className="w-full p-2 border rounded mb-4"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-900 text-white px-4 py-2 rounded"
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

export default RegionsPage;

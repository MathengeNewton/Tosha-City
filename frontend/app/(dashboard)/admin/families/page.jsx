// app/(dashboard)/admin/families/page.jsx
// Families page: List of families with visual tree structure (father, mother, children).
// Added CRUD operations with modal for create/edit.
// Visual tree using Tailwind CSS styled divs instead of simple list.
// More mock data with regions matching single parish setup.
// Aesthetics similar: cards, tables.

"use client";
import { useState } from "react";

const mockFamilies = [
  {
    id: 1,
    familyName: "Kamau Family",
    father: "John Kamau",
    mother: "Mary Kamau",
    children: ["Alice Kamau (12)", "Bob Kamau (8)"],
    region: "Ruiru",
  },
  {
    id: 2,
    familyName: "Wanjiku Family",
    father: "Peter Wanjiku",
    mother: "Anne Wanjiku",
    children: ["Carol Wanjiku (15)", "David Wanjiku (10)", "Eve Wanjiku (5)"],
    region: "Mombasa Road",
  },
  {
    id: 3,
    familyName: "Mutua Family",
    father: "James Mutua",
    mother: "Grace Mutua",
    children: ["Frank Mutua (7)", "Gloria Mutua (3)"],
    region: "Kiambu",
  },
  {
    id: 4,
    familyName: "Njeri Family",
    father: "Samuel Njeri",
    mother: "Esther Njeri",
    children: ["Henry Njeri (18)", "Ivy Njeri (14)"],
    region: "Thika Road",
  },
  {
    id: 5,
    familyName: "Ochieng Family",
    father: "Michael Ochieng",
    mother: "Sarah Ochieng",
    children: ["Jack Ochieng (9)"],
    region: "Nairobi CBD",
  },
];

const FamiliesPage = () => {
  const [families, setFamilies] = useState(mockFamilies);
  const [expanded, setExpanded] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingFamily, setEditingFamily] = useState(null);
  const [formData, setFormData] = useState({
    familyName: "",
    father: "",
    mother: "",
    region: "",
    children: "",
  });

  const toggleExpand = (id) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    setEditingFamily(null);
    setFormData({
      familyName: "",
      father: "",
      mother: "",
      region: "",
      children: "",
    });
    setShowModal(true);
  };

  const handleEdit = (family) => {
    setEditingFamily(family);
    setFormData({ ...family, children: family.children.join(", ") });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setFamilies(families.filter((f) => f.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const childrenArray = formData.children
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c);
    const familyData = { ...formData, children: childrenArray };
    if (editingFamily) {
      setFamilies(
        families.map((f) =>
          f.id === editingFamily.id ? { ...f, ...familyData } : f
        )
      );
    } else {
      setFamilies([...families, { id: families.length + 1, ...familyData }]);
    }
    setShowModal(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="w-full space-y-8 bg-gray-50 min-h-screen p-6">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          Families Management
        </h1>
        <p className="text-gray-600 mt-1">Manage PCEA church family trees</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Family List</h3>
          <button
            onClick={handleCreate}
            className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5]"
          >
            Create Family
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Family Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Father
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mother
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Region
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {families.map((family) => (
                <>
                  <tr key={family.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => toggleExpand(family.id)}
                        className="font-medium"
                      >
                        {family.familyName}{" "}
                        {expanded.includes(family.id) ? "▼" : "▶"}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {family.father}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {family.mother}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {family.region}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(family)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(family.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                  {expanded.includes(family.id) && (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 bg-gray-50">
                        <p className="font-semibold mb-2">Family Tree:</p>
                        <div className="flex flex-col items-center">
                          <div className="flex space-x-4 mb-2">
                            <div className="bg-blue-100 text-blue-800 p-3 rounded-lg shadow">
                              {family.father}
                            </div>
                            <div className="bg-pink-100 text-pink-800 p-3 rounded-lg shadow">
                              {family.mother}
                            </div>
                          </div>
                          <div className="h-6 w-0.5 bg-gray-400"></div>
                          <div className="flex flex-wrap justify-center gap-3 mt-2">
                            {family.children.map((child, idx) => (
                              <div
                                key={idx}
                                className="bg-green-100 text-green-800 p-3 rounded-lg shadow"
                              >
                                {child}
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg w-96">
            <h3 className="text-lg font-semibold mb-4">
              {editingFamily ? "Edit Family" : "Create Family"}
            </h3>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                name="familyName"
                value={formData.familyName}
                onChange={handleChange}
                placeholder="Family Name"
                className="w-full p-2 border rounded mb-2"
                required
              />
              <input
                type="text"
                name="father"
                value={formData.father}
                onChange={handleChange}
                placeholder="Father"
                className="w-full p-2 border rounded mb-2"
                required
              />
              <input
                type="text"
                name="mother"
                value={formData.mother}
                onChange={handleChange}
                placeholder="Mother"
                className="w-full p-2 border rounded mb-2"
                required
              />
              <input
                type="text"
                name="region"
                value={formData.region}
                onChange={handleChange}
                placeholder="Region"
                className="w-full p-2 border rounded mb-2"
                required
              />
              <input
                type="text"
                name="children"
                value={formData.children}
                onChange={handleChange}
                placeholder="Children (comma separated, e.g., Alice (12), Bob (8))"
                className="w-full p-2 border rounded mb-4"
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

export default FamiliesPage;

// app/(dashboard)/admin/campaigns/page.jsx
// Campaigns page: List of campaigns (e.g., buy a car), UI to create/edit/delete.
// Mock data. Similar aesthetics.

"use client";
import { useState } from "react";

const mockCampaigns = [
  {
    id: 1,
    name: "Buy Church Van",
    goal: "KES 5,000,000",
    raised: "KES 2,300,000",
    status: "Active",
  },
  {
    id: 2,
    name: "Build Sunday School Hall",
    goal: "KES 10,000,000",
    raised: "KES 4,500,000",
    status: "Active",
  },
  {
    id: 3,
    name: "Mission Trip Fund",
    goal: "KES 2,000,000",
    raised: "KES 1,800,000",
    status: "Completed",
  },
];

const CampaignsPage = () => {
  const [campaigns, setCampaigns] = useState(mockCampaigns);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    goal: "",
    raised: "",
    status: "Active",
  });

  // Similar handleCreate, handleEdit, handleDelete, handleSubmit, handleChange as in UsersPage
  // Omitted for brevity, but implement similarly

  return (
    <div className="w-full space-y-8 bg-gray-50 min-h-screen p-6">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          Campaigns Management
        </h1>
        <p className="text-gray-600 mt-1">Manage PCEA church campaigns</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Campaign List</h3>
          <button
            // onClick={handleCreate}
            className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5]"
          >
            Create Campaign
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Goal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Raised
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {campaign.goal}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {campaign.raised}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {campaign.status}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      /* onClick={() => handleEdit(campaign)} */ className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      /* onClick={() => handleDelete(campaign.id)} */ className="text-red-600 hover:text-red-900"
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

      {/* Modal similar to UsersPage */}
    </div>
  );
};

export default CampaignsPage;

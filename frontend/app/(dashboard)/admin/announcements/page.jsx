"use client";
import { useState, useEffect } from "react";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";

const ANNOUNCEMENT_TYPES = {
  general: "General",
  event: "Event",
  prayer: "Prayer",
  ministry: "Ministry",
};

const ANNOUNCEMENT_PRIORITIES = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const AnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [viewingAnnouncement, setViewingAnnouncement] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    type: "",
    priority: "",
    active: "",
    mobileAppVisible: "",
  });
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "general",
    priority: "medium",
    expiresAt: "",
    isMobileAppVisible: false,
    metadata: {
      imageUrl: "",
      eventDate: "",
      location: "",
      contactPerson: "",
      contactPhone: "",
    },
  });

  useEffect(() => {
    loadAnnouncements();
  }, [filters]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.type) params.type = filters.type;
      if (filters.priority) params.priority = filters.priority;
      if (filters.active !== "") params.isActive = filters.active === "true";
      if (filters.mobileAppVisible !== "")
        params.isMobileAppVisible = filters.mobileAppVisible === "true";

      const response = await apiClient.announcements.getAll(params);
      setAnnouncements(response.data || []);
    } catch (error) {
      console.error("Error loading announcements:", error);
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAnnouncement(null);
    setFormData({
      title: "",
      content: "",
      type: "general",
      priority: "medium",
      expiresAt: "",
      isMobileAppVisible: false,
      metadata: {
        imageUrl: "",
        eventDate: "",
        location: "",
        contactPerson: "",
        contactPhone: "",
      },
    });
    setShowModal(true);
  };

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title || "",
      content: announcement.content || "",
      type: announcement.type || "general",
      priority: announcement.priority || "medium",
      expiresAt: announcement.expiresAt
        ? announcement.expiresAt.split("T")[0]
        : "",
      isMobileAppVisible: announcement.isMobileAppVisible || false,
      metadata: announcement.metadata || {
        imageUrl: "",
        eventDate: "",
        location: "",
        contactPerson: "",
        contactPhone: "",
      },
    });
    setShowModal(true);
  };

  const handleView = (announcement) => {
    setViewingAnnouncement(announcement);
    setShowViewModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this announcement?"))
      return;

    try {
      await apiClient.announcements.delete(id);
      toast.success("Announcement deleted successfully");
      loadAnnouncements();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Failed to delete announcement");
    }
  };

  const handlePublish = async (id) => {
    try {
      await apiClient.announcements.publish(id);
      toast.success("Announcement published successfully");
      loadAnnouncements();
    } catch (error) {
      console.error("Error publishing announcement:", error);
      toast.error("Failed to publish announcement");
    }
  };

  const handleExpire = async (id) => {
    try {
      await apiClient.announcements.expire(id);
      toast.success("Announcement expired successfully");
      loadAnnouncements();
    } catch (error) {
      console.error("Error expiring announcement:", error);
      toast.error("Failed to expire announcement");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.content) {
      toast.error("Title and content are required");
      return;
    }

    try {
      const announcementData = {
        ...formData,
        expiresAt: formData.expiresAt || null,
        metadata: Object.keys(formData.metadata).some(
          (key) => formData.metadata[key]
        )
          ? formData.metadata
          : null,
      };

      if (editingAnnouncement) {
        await apiClient.announcements.update(
          editingAnnouncement.id,
          announcementData
        );
        toast.success("Announcement updated successfully");
      } else {
        await apiClient.announcements.create(announcementData);
        toast.success("Announcement created successfully");
      }
      setShowModal(false);
      loadAnnouncements();
    } catch (error) {
      console.error("Error saving announcement:", error);
      toast.error(
        error.response?.data?.message || "Failed to save announcement"
      );
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith("metadata.")) {
      const metadataKey = name.split(".")[1];
      setFormData({
        ...formData,
        metadata: {
          ...formData.metadata,
          [metadataKey]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === "checkbox" ? checked : value,
      });
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const isExpired = (announcement) => {
    if (!announcement.expiresAt) return false;
    return new Date(announcement.expiresAt) < new Date();
  };

  const isActive = (announcement) => {
    return announcement.isActive && !isExpired(announcement);
  };

  if (loading) {
    return (
      <div className="w-full space-y-8 bg-gray-50 min-h-screen p-6 flex items-center justify-center">
        <div className="text-gray-600">Loading announcements...</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 bg-gray-50 min-h-screen p-6">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          Announcements Management
        </h1>
        <p className="text-gray-600 mt-1">
          Manage church announcements for web and mobile app
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Search by title..."
            className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
          />
          <select
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
          >
            <option value="">All Types</option>
            {Object.entries(ANNOUNCEMENT_TYPES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            name="priority"
            value={filters.priority}
            onChange={handleFilterChange}
            className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
          >
            <option value="">All Priorities</option>
            {Object.entries(ANNOUNCEMENT_PRIORITIES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            name="active"
            value={filters.active}
            onChange={handleFilterChange}
            className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive/Expired</option>
          </select>
          <select
            name="mobileAppVisible"
            value={filters.mobileAppVisible}
            onChange={handleFilterChange}
            className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
          >
            <option value="">All Visibility</option>
            <option value="true">Mobile App Visible</option>
            <option value="false">Not Mobile Visible</option>
          </select>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Announcements List
          </h3>
          <button
            onClick={handleCreate}
            className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors"
          >
            Create Announcement
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Published
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mobile
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {announcements.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No announcements found.
                  </td>
                </tr>
              ) : (
                announcements.map((announcement) => (
                  <tr key={announcement.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {announcement.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded capitalize">
                        {announcement.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          announcement.priority === "high"
                            ? "bg-red-100 text-red-800"
                            : announcement.priority === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {ANNOUNCEMENT_PRIORITIES[announcement.priority]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {announcement.publishedAt
                        ? new Date(announcement.publishedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {announcement.expiresAt
                        ? new Date(announcement.expiresAt).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isActive(announcement) ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          {isExpired(announcement) ? "Expired" : "Inactive"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {announcement.isMobileAppVisible ? (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          ✓
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleView(announcement)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      {announcement.publishedAt ? (
                        <button
                          onClick={() => handleExpire(announcement.id)}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          Expire
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePublish(announcement.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Publish
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(announcement.id)}
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
        <AnnouncementFormModal
          formData={formData}
          editingAnnouncement={editingAnnouncement}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* View Modal */}
      {showViewModal && viewingAnnouncement && (
        <AnnouncementViewModal
          announcement={viewingAnnouncement}
          onClose={() => {
            setShowViewModal(false);
            setViewingAnnouncement(null);
          }}
        />
      )}
    </div>
  );
};

// Announcement Form Modal Component
const AnnouncementFormModal = ({
  formData,
  editingAnnouncement,
  onChange,
  onSubmit,
  onClose,
}) => {
  const showEventMetadata = formData.type === "event" || formData.type === "ministry";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {editingAnnouncement ? "Edit Announcement" : "Create Announcement"}
        </h3>
        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={onChange}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={onChange}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                required
              >
                {Object.entries(ANNOUNCEMENT_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority *
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={onChange}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                required
              >
                {Object.entries(ANNOUNCEMENT_PRIORITIES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expires At
              </label>
              <input
                type="date"
                name="expiresAt"
                value={formData.expiresAt}
                onChange={onChange}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content *
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={onChange}
              rows="6"
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
              required
            />
          </div>

          {/* Event/Ministr y Metadata */}
          {showEventMetadata && (
            <div className="mb-4 p-4 bg-gray-50 rounded-md">
              <h4 className="font-medium text-gray-700 mb-3">Event Details</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Date
                  </label>
                  <input
                    type="datetime-local"
                    name="metadata.eventDate"
                    value={formData.metadata.eventDate}
                    onChange={onChange}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    name="metadata.location"
                    value={formData.metadata.location}
                    onChange={onChange}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    name="metadata.contactPerson"
                    value={formData.metadata.contactPerson}
                    onChange={onChange}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    name="metadata.contactPhone"
                    value={formData.metadata.contactPhone}
                    onChange={onChange}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  name="metadata.imageUrl"
                  value={formData.metadata.imageUrl}
                  onChange={onChange}
                  placeholder="https://example.com/image.jpg"
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                />
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isMobileAppVisible"
                checked={formData.isMobileAppVisible}
                onChange={onChange}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">
                Make visible in mobile app
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
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
  );
};

// Announcement View Modal Component
const AnnouncementViewModal = ({ announcement, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-2xl font-semibold mb-2">{announcement.title}</h3>
            <div className="flex gap-2 mb-2">
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded capitalize">
                {announcement.type}
              </span>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  announcement.priority === "high"
                    ? "bg-red-100 text-red-800"
                    : announcement.priority === "medium"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {ANNOUNCEMENT_PRIORITIES[announcement.priority]}
              </span>
              {announcement.isMobileAppVisible && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                  Mobile App
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              {announcement.publishedAt && (
                <p>
                  Published:{" "}
                  {new Date(announcement.publishedAt).toLocaleString()}
                </p>
              )}
              {announcement.expiresAt && (
                <p>
                  Expires: {new Date(announcement.expiresAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {announcement.metadata?.imageUrl && (
          <div className="mb-4">
            <img
              src={announcement.metadata.imageUrl}
              alt={announcement.title}
              className="w-full h-64 object-cover rounded-md"
            />
          </div>
        )}

        <div className="mb-4">
          <div className="text-gray-700 whitespace-pre-wrap">
            {announcement.content}
          </div>
        </div>

        {announcement.metadata && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h4 className="font-medium text-gray-700 mb-2">Event Details</h4>
            <div className="space-y-1 text-sm text-gray-600">
              {announcement.metadata.eventDate && (
                <p>
                  <strong>Event Date:</strong>{" "}
                  {new Date(announcement.metadata.eventDate).toLocaleString()}
                </p>
              )}
              {announcement.metadata.location && (
                <p>
                  <strong>Location:</strong> {announcement.metadata.location}
                </p>
              )}
              {announcement.metadata.contactPerson && (
                <p>
                  <strong>Contact:</strong> {announcement.metadata.contactPerson}
                  {announcement.metadata.contactPhone &&
                    ` - ${announcement.metadata.contactPhone}`}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementsPage;




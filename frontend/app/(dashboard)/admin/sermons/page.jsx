"use client";
import { useState, useEffect } from "react";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";

const SermonsPage = () => {
  const [sermons, setSermons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingSermon, setEditingSermon] = useState(null);
  const [viewingSermon, setViewingSermon] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    preacher: "",
    published: "",
    dateFrom: "",
    dateTo: "",
  });
  const [formData, setFormData] = useState({
    title: "",
    notes: "",
    bibleVerses: [],
    stories: "",
    lessons: "",
    sermonDate: "",
    preacher: "",
    location: "",
    isPublished: false,
  });
  const [bibleVerseInput, setBibleVerseInput] = useState("");

  useEffect(() => {
    loadSermons();
  }, [filters]);

  const loadSermons = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.preacher) params.preacher = filters.preacher;
      if (filters.published !== "") params.isPublished = filters.published === "true";
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;

      const response = await apiClient.sermons.getAll(params);
      setSermons(response.data || []);
    } catch (error) {
      console.error("Error loading sermons:", error);
      toast.error("Failed to load sermons");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSermon(null);
    setFormData({
      title: "",
      notes: "",
      bibleVerses: [],
      stories: "",
      lessons: "",
      sermonDate: "",
      preacher: "",
      location: "",
      isPublished: false,
    });
    setBibleVerseInput("");
    setShowModal(true);
  };

  const handleEdit = (sermon) => {
    setEditingSermon(sermon);
    setFormData({
      title: sermon.title || "",
      notes: sermon.notes || "",
      bibleVerses: sermon.bibleVerses || [],
      stories: sermon.stories || "",
      lessons: sermon.lessons || "",
      sermonDate: sermon.sermonDate ? sermon.sermonDate.split("T")[0] : "",
      preacher: sermon.preacher || "",
      location: sermon.location || "",
      isPublished: sermon.isPublished || false,
    });
    setBibleVerseInput("");
    setShowModal(true);
  };

  const handleView = (sermon) => {
    setViewingSermon(sermon);
    setShowViewModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this sermon?")) return;

    try {
      await apiClient.sermons.delete(id);
      toast.success("Sermon deleted successfully");
      loadSermons();
    } catch (error) {
      console.error("Error deleting sermon:", error);
      toast.error("Failed to delete sermon");
    }
  };

  const handlePublish = async (id) => {
    try {
      await apiClient.sermons.publish(id);
      toast.success("Sermon published successfully");
      loadSermons();
    } catch (error) {
      console.error("Error publishing sermon:", error);
      toast.error("Failed to publish sermon");
    }
  };

  const handleUnpublish = async (id) => {
    try {
      await apiClient.sermons.unpublish(id);
      toast.success("Sermon unpublished successfully");
      loadSermons();
    } catch (error) {
      console.error("Error unpublishing sermon:", error);
      toast.error("Failed to unpublish sermon");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.sermonDate) {
      toast.error("Title and sermon date are required");
      return;
    }

    try {
      const sermonData = {
        ...formData,
        sermonDate: formData.sermonDate,
      };

      if (editingSermon) {
        await apiClient.sermons.update(editingSermon.id, sermonData);
        toast.success("Sermon updated successfully");
      } else {
        await apiClient.sermons.create(sermonData);
        toast.success("Sermon created successfully");
      }
      setShowModal(false);
      loadSermons();
    } catch (error) {
      console.error("Error saving sermon:", error);
      toast.error(error.response?.data?.message || "Failed to save sermon");
    }
  };

  const handleAddBibleVerse = () => {
    if (bibleVerseInput.trim()) {
      setFormData({
        ...formData,
        bibleVerses: [...formData.bibleVerses, bibleVerseInput.trim()],
      });
      setBibleVerseInput("");
    }
  };

  const handleRemoveBibleVerse = (index) => {
    setFormData({
      ...formData,
      bibleVerses: formData.bibleVerses.filter((_, i) => i !== index),
    });
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const uniquePreachers = [...new Set(sermons.map((s) => s.preacher).filter(Boolean))];

  if (loading) {
    return (
      <div className="w-full space-y-8 bg-gray-50 min-h-screen p-6 flex items-center justify-center">
        <div className="text-gray-600">Loading sermons...</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 bg-gray-50 min-h-screen p-6">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          Sermons Management
        </h1>
        <p className="text-gray-600 mt-1">
          Manage sermons, notes, bible verses, stories, and lessons
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
            name="preacher"
            value={filters.preacher}
            onChange={handleFilterChange}
            className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
          >
            <option value="">All Preachers</option>
            {uniquePreachers.map((preacher) => (
              <option key={preacher} value={preacher}>
                {preacher}
              </option>
            ))}
          </select>
          <select
            name="published"
            value={filters.published}
            onChange={handleFilterChange}
            className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="true">Published</option>
            <option value="false">Unpublished</option>
          </select>
          <input
            type="date"
            name="dateFrom"
            value={filters.dateFrom}
            onChange={handleFilterChange}
            placeholder="From Date"
            className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
          />
          <input
            type="date"
            name="dateTo"
            value={filters.dateTo}
            onChange={handleFilterChange}
            placeholder="To Date"
            className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Sermons List</h3>
          <button
            onClick={handleCreate}
            className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors"
          >
            Create Sermon
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
                  Preacher
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bible Verses
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
              {sermons.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No sermons found.
                  </td>
                </tr>
              ) : (
                sermons.map((sermon) => (
                  <tr key={sermon.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {sermon.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sermon.preacher || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sermon.sermonDate
                        ? new Date(sermon.sermonDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex flex-wrap gap-1">
                        {sermon.bibleVerses?.slice(0, 2).map((verse, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                          >
                            {verse}
                          </span>
                        ))}
                        {sermon.bibleVerses?.length > 2 && (
                          <span className="px-2 py-1 text-xs text-gray-500">
                            +{sermon.bibleVerses.length - 2} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {sermon.isPublished ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Published
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleView(sermon)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(sermon)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      {sermon.isPublished ? (
                        <button
                          onClick={() => handleUnpublish(sermon.id)}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          Unpublish
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePublish(sermon.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Publish
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(sermon.id)}
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
        <SermonFormModal
          formData={formData}
          bibleVerseInput={bibleVerseInput}
          editingSermon={editingSermon}
          onChange={handleChange}
          onBibleVerseInputChange={setBibleVerseInput}
          onAddBibleVerse={handleAddBibleVerse}
          onRemoveBibleVerse={handleRemoveBibleVerse}
          onSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* View Modal */}
      {showViewModal && viewingSermon && (
        <SermonViewModal
          sermon={viewingSermon}
          onClose={() => {
            setShowViewModal(false);
            setViewingSermon(null);
          }}
        />
      )}
    </div>
  );
};

// Sermon Form Modal Component
const SermonFormModal = ({
  formData,
  bibleVerseInput,
  editingSermon,
  onChange,
  onBibleVerseInputChange,
  onAddBibleVerse,
  onRemoveBibleVerse,
  onSubmit,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {editingSermon ? "Edit Sermon" : "Create Sermon"}
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
                Sermon Date *
              </label>
              <input
                type="date"
                name="sermonDate"
                value={formData.sermonDate}
                onChange={onChange}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preacher
              </label>
              <input
                type="text"
                name="preacher"
                value={formData.preacher}
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
                name="location"
                value={formData.location}
                onChange={onChange}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes *
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={onChange}
              rows="6"
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bible Verses
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={bibleVerseInput}
                onChange={(e) => onBibleVerseInputChange(e.target.value)}
                placeholder="e.g., John 3:16"
                className="flex-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddBibleVerse();
                  }
                }}
              />
              <button
                type="button"
                onClick={onAddBibleVerse}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.bibleVerses.map((verse, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                >
                  {verse}
                  <button
                    type="button"
                    onClick={() => onRemoveBibleVerse(index)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stories
            </label>
            <textarea
              name="stories"
              value={formData.stories}
              onChange={onChange}
              rows="4"
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lessons
            </label>
            <textarea
              name="lessons"
              value={formData.lessons}
              onChange={onChange}
              rows="4"
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-transparent"
            />
          </div>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isPublished"
                checked={formData.isPublished}
                onChange={onChange}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">
                Publish immediately
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

// Sermon View Modal Component
const SermonViewModal = ({ sermon, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-2xl font-semibold mb-2">{sermon.title}</h3>
            <div className="text-sm text-gray-600 space-y-1">
              {sermon.preacher && <p>Preacher: {sermon.preacher}</p>}
              {sermon.location && <p>Location: {sermon.location}</p>}
              {sermon.sermonDate && (
                <p>
                  Date: {new Date(sermon.sermonDate).toLocaleDateString()}
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

        {sermon.bibleVerses && sermon.bibleVerses.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-700 mb-2">Bible Verses:</h4>
            <div className="flex flex-wrap gap-2">
              {sermon.bibleVerses.map((verse, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {verse}
                </span>
              ))}
            </div>
          </div>
        )}

        {sermon.notes && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-700 mb-2">Notes:</h4>
            <div className="text-gray-700 whitespace-pre-wrap">{sermon.notes}</div>
          </div>
        )}

        {sermon.stories && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-700 mb-2">Stories:</h4>
            <div className="text-gray-700 whitespace-pre-wrap">{sermon.stories}</div>
          </div>
        )}

        {sermon.lessons && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-700 mb-2">Lessons:</h4>
            <div className="text-gray-700 whitespace-pre-wrap">{sermon.lessons}</div>
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

export default SermonsPage;




"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "../../../../lib/api";
import { toast } from "react-toastify";

const AdminDashboardPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalDistricts: 0,
    totalSermons: 0,
    publishedSermons: 0,
    totalAnnouncements: 0,
    activeAnnouncements: 0,
  });
  const [recentSermons, setRecentSermons] = useState([]);
  const [activeAnnouncements, setActiveAnnouncements] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load districts
      const districtsRes = await apiClient.districts.getAll();
      const districts = districtsRes.data || [];
      const totalDistricts = districts.length;
      const totalMembers = districts.reduce((sum, d) => sum + (d.memberCount || 0), 0);

      // Load sermons
      const sermonsRes = await apiClient.sermons.getAll();
      const sermons = sermonsRes.data || [];
      const totalSermons = sermons.length;
      const publishedSermons = sermons.filter((s) => s.isPublished).length;
      const recentSermonsList = sermons
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      // Load announcements
      const announcementsRes = await apiClient.announcements.getActive();
      const announcements = announcementsRes.data || [];
      const totalAnnouncementsRes = await apiClient.announcements.getAll();
      const allAnnouncements = totalAnnouncementsRes.data || [];
      const activeAnnouncementsList = announcements.slice(0, 5);

      setStats({
        totalMembers,
        totalDistricts,
        totalSermons,
        publishedSermons,
        totalAnnouncements: allAnnouncements.length,
        activeAnnouncements: announcements.length,
        upcomingEvents: 0, // Will be updated when Events API is implemented
        tithesThisMonth: "KES 0", // Will be updated when financial API is implemented
      });
      setRecentSermons(recentSermonsList);
      setActiveAnnouncements(activeAnnouncementsList);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Note: Charts removed - will be re-added when backend provides historical data
  // For now, dashboard shows only real-time stats from API

  if (loading) {
    return (
      <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            PCEA Church Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/admin/sermons")}
            className="bg-blue-900 text-white px-4 py-2 rounded-md hover:bg-[#1e88b5] transition-colors text-sm"
          >
            Create Sermon
          </button>
          <button
            onClick={() => router.push("/admin/announcements")}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
          >
            Create Announcement
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalMembers.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg
                className="w-7 h-7 text-[#0D47A1]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H9v-1a4 4 0 014-4h4a4 4 0 014 4v1z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Districts</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalDistricts}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg
                className="w-7 h-7 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h-4m-6 0H5"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sermons</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.publishedSermons}/{stats.totalSermons}
              </p>
              <p className="text-xs text-gray-500">Published/Total</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <svg
                className="w-7 h-7 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Announcements</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.activeAnnouncements}/{stats.totalAnnouncements}
              </p>
              <p className="text-xs text-gray-500">Active/Total</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <svg
                className="w-7 h-7 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
          </div>
        </div>

      </div>

      {/* Charts Row - Removed dummy charts, will be re-added when backend provides historical data */}

      {/* Bottom Row: Recent Sermons + Active Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sermons */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Sermons
            </h3>
            <button
              onClick={() => router.push("/admin/sermons")}
              className="text-sm text-blue-900 hover:text-blue-700"
            >
              View All →
            </button>
          </div>
          <div className="p-5">
            {recentSermons.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                No sermons yet. Create your first sermon!
              </p>
            ) : (
              recentSermons.map((sermon) => (
                <div
                  key={sermon.id}
                  className="flex justify-between items-start py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{sermon.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {sermon.preacher && (
                        <p className="text-sm text-gray-500">
                          {sermon.preacher}
                        </p>
                      )}
                      {sermon.sermonDate && (
                        <p className="text-sm text-gray-500">
                          • {new Date(sermon.sermonDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {sermon.bibleVerses && sermon.bibleVerses.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {sermon.bibleVerses.slice(0, 2).map((verse, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded"
                          >
                            {verse}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      sermon.isPublished
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {sermon.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Announcements */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Active Announcements
            </h3>
            <button
              onClick={() => router.push("/admin/announcements")}
              className="text-sm text-blue-900 hover:text-blue-700"
            >
              View All →
            </button>
          </div>
          <div className="p-5">
            {activeAnnouncements.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                No active announcements. Create one now!
              </p>
            ) : (
              activeAnnouncements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="flex justify-between items-start py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">
                        {announcement.title}
                      </p>
                      <span
                        className={`px-2 py-0.5 text-xs rounded ${
                          announcement.priority === "high"
                            ? "bg-red-100 text-red-800"
                            : announcement.priority === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {announcement.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {announcement.content}
                    </p>
                    {announcement.publishedAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        Published:{" "}
                        {new Date(announcement.publishedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {announcement.isMobileAppVisible && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded ml-2">
                      Mobile
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;

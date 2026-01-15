// UserDashboard.tsx
"use client";
import { useState, useEffect } from "react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  HomeIcon,
  UserIcon,
  UsersIcon,
  CalendarIcon,
  BanknotesIcon,
  BellIcon,
  EnvelopeIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const UserDashboardPage = () => {
  const [userStats, setUserStats] = useState({
    myContributions: "KES 48,500",
    attendanceThisYear: 42,
    upcomingEvents: 5,
    familyMembers: 6,
  });

  // Simulate live updates (e.g. new contribution notification)
  useEffect(() => {
    const timer = setInterval(() => {
      setUserStats((prev) => ({
        ...prev,
        attendanceThisYear: Math.min(
          52,
          prev.attendanceThisYear + Math.floor(Math.random() * 2)
        ),
        upcomingEvents: Math.max(
          3,
          prev.upcomingEvents + Math.random() > 0.7 ? 1 : 0
        ),
      }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // My Attendance Trend (Line Chart)
  const attendanceData = {
    labels: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
    ],
    datasets: [
      {
        label: "Sunday Services Attended",
        data: [
          4,
          3,
          5,
          4,
          4,
          5,
          4,
          5,
          4,
          5,
          userStats.attendanceThisYear >= 42 ? 5 : 4,
        ],
        borderColor: "#0D47A1",
        backgroundColor: "rgba(13, 71, 161, 0.1)",
        tension: 0.4,
      },
    ],
  };

  // Monthly Contributions (Bar Chart)
  const contributionsData = {
    labels: ["Jul", "Aug", "Sep", "Oct", "Nov"],
    datasets: [
      {
        label: "My Tithes & Offerings (KES)",
        data: [8500, 9200, 10500, 9800, 9500],
        backgroundColor: "#10b981",
      },
    ],
  };

  // Upcoming Events (Simple List)
  const upcomingEvents = [
    {
      name: "Youth Fellowship",
      date: "Sat, 22 Nov 2025",
      location: "PCEA Lang'ata",
    },
    {
      name: "Family Sunday",
      date: "Sun, 30 Nov 2025",
      location: "Main Sanctuary",
    },
    {
      name: "Christmas Carol Service",
      date: "Sun, 21 Dec 2025",
      location: "St. Andrews",
    },
    {
      name: "Men's Breakfast",
      date: "Sat, 10 Jan 2026",
      location: "Church Hall",
    },
  ];

  return (
    <div className="w-full lg:p-2 space-y-8 bg-gray-50 min-h-screen">
      {/* Welcome Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-[#0D47A1]/10 rounded-full">
            <UserIcon className="h-10 w-10 text-[#0D47A1]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Karibu, Brother/Sister John Kamau
            </h1>
            <p className="text-gray-600">
              PCEA Lang'ata Parish • Membership ID: PC/KE/2021/4872
            </p>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* My Contributions */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                My Contributions (2025)
              </p>
              <p className="text-3xl font-bold text-[#0D47A1] mt-2">
                {userStats.myContributions}
              </p>
              <p className="text-xs text-green-600 mt-1">
                ↑ KES 9,500 this month
              </p>
            </div>
            <div className="p-4 bg-green-100 rounded-full">
              <BanknotesIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Attendance This Year */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                Services Attended (2025)
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {userStats.attendanceThisYear}/48
              </p>
              <p className="text-xs text-blue-600 mt-1">Great consistency!</p>
            </div>
            <div className="p-4 bg-blue-100 rounded-full">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Family Members */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                Family Registered
              </p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {userStats.familyMembers}
              </p>
              <p className="text-xs text-gray-500 mt-1">Spouse + 4 children</p>
            </div>
            <div className="p-4 bg-purple-100 rounded-full">
              <UsersIcon className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                My Upcoming Events
              </p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {userStats.upcomingEvents}
              </p>
              <p className="text-xs text-orange-600 mt-1">
                Youth Fellowship this Saturday
              </p>
            </div>
            <div className="p-4 bg-orange-100 rounded-full">
              <HeartIcon className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            My Attendance Trend 2025
          </h3>
          <Line
            data={attendanceData}
            options={{
              responsive: true,
              plugins: { legend: { position: "bottom" } },
              scales: { y: { min: 0, max: 5 } },
            }}
          />
        </div>

        {/* My Monthly Giving */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            My Monthly Contributions
          </h3>
          <Bar
            data={contributionsData}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
            }}
          />
        </div>
      </div>

      {/* Upcoming Events List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-[#0D47A1]" />
            My Upcoming Events
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {upcomingEvents.map((event, i) => (
            <div
              key={i}
              className="p-5 hover:bg-gray-50 transition-colors flex justify-between items-center"
            >
              <div>
                <p className="font-medium text-gray-900">{event.name}</p>
                <p className="text-sm text-gray-600">{event.location}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {event.date}
                </p>
                <button className="text-xs text-[#0D47A1] hover:underline mt-1">
                  RSVP →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button className="bg-[#0D47A1] text-white p-5 rounded-xl hover:bg-[#0D47A1]/90 transition-colors flex flex-col items-center gap-2">
          <BanknotesIcon className="h-8 w-8" />
          <span className="font-medium">Give Now</span>
        </button>
        <button className="bg-gray-100 text-gray-800 p-5 rounded-xl hover:bg-gray-200 transition-colors flex flex-col items-center gap-2">
          <EnvelopeIcon className="h-8 w-8" />
          <span className="font-medium">Messages</span>
        </button>
        <button className="bg-gray-100 text-gray-800 p-5 rounded-xl hover:bg-gray-200 transition-colors flex flex-col items-center gap-2">
          <BellIcon className="h-8 w-8" />
          <span className="font-medium">Notifications</span>
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            3
          </span>
        </button>
        <button className="bg-gray-100 text-gray-800 p-5 rounded-xl hover:bg-gray-200 transition-colors flex flex-col items-center gap-2">
          <UsersIcon className="h-8 w-8" />
          <span className="font-medium">My Groups</span>
        </button>
      </div>
    </div>
  );
};

export default UserDashboardPage;

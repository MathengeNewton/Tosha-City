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
    myPurchases: "KES 48,500",
    activeDaysThisYear: 42,
    upcomingPromos: 5,
    linkedAccounts: 6,
  });

  // Simulate live updates (e.g. new contribution notification)
  useEffect(() => {
    const timer = setInterval(() => {
      setUserStats((prev) => ({
        ...prev,
        activeDaysThisYear: Math.min(
          52,
          prev.activeDaysThisYear + Math.floor(Math.random() * 2)
        ),
        upcomingPromos: Math.max(
          3,
          prev.upcomingPromos + Math.random() > 0.7 ? 1 : 0
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
        label: "Active sales days",
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
          userStats.activeDaysThisYear >= 42 ? 5 : 4,
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
        label: "My purchases (KES)",
        data: [8500, 9200, 10500, 9800, 9500],
        backgroundColor: "#10b981",
      },
    ],
  };

  // Upcoming Events (Simple List)
  const upcomingEvents = [
    {
      name: "Weekend grill specials",
      date: "Sat, 22 Nov 2025",
      location: "LakeTown Main Branch",
    },
    {
      name: "Bulk beef week",
      date: "Sun, 30 Nov 2025",
      location: "LakeTown Express",
    },
    {
      name: "Holiday hampers",
      date: "Sun, 21 Dec 2025",
      location: "LakeTown Westlands",
    },
    {
      name: "Cash & carry day",
      date: "Sat, 10 Jan 2026",
      location: "LakeTown HQ",
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
              Karibu, John Kamau
            </h1>
            <p className="text-gray-600">
              LakeTown Main Branch • Staff ID: LT/KE/2026/1001
            </p>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Purchases */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                My purchases (2025)
              </p>
              <p className="text-3xl font-bold text-[#0D47A1] mt-2">
                {userStats.myPurchases}
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

        {/* Active days */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                Active days (2025)
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {userStats.activeDaysThisYear}/48
              </p>
              <p className="text-xs text-blue-600 mt-1">Great consistency!</p>
            </div>
            <div className="p-4 bg-blue-100 rounded-full">
              <CalendarIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Linked accounts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                Linked accounts
              </p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {userStats.linkedAccounts}
              </p>
              <p className="text-xs text-gray-500 mt-1">Household + team</p>
            </div>
            <div className="p-4 bg-purple-100 rounded-full">
              <UsersIcon className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Upcoming promos */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                Upcoming promos
              </p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {userStats.upcomingPromos}
              </p>
              <p className="text-xs text-orange-600 mt-1">
                Weekend grill this Saturday
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
        {/* Activity trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            My activity trend 2025
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

        {/* Monthly purchases */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            My monthly purchases
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

      {/* Upcoming promos list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-[#0D47A1]" />
            Upcoming promos
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
                  Details →
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
          <span className="font-medium">Reorder</span>
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

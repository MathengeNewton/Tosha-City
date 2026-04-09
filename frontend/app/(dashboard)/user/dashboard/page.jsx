import UserDashboardPage from "./UserDashboard";

export const metadata = {
  title: "User Dashboard | LakeTown Butchery",
  description:
    "Access your LakeTown Butchery dashboard — account details, activity, and personalized tools.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "User Dashboard | LakeTown Butchery",
    description:
      "Manage your LakeTown Butchery account and access your dashboard resources.",
    url: "https://admin.laketown.co.ke/dashboard/user",
    siteName: "LakeTown Butchery",
    type: "website",
    images: [
      {
        url: "/images/og-dashboard.png",
        width: 1200,
        height: 630,
        alt: "LakeTown Butchery user dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "User Dashboard | LakeTown Butchery",
    description:
      "View your LakeTown Butchery dashboard and account details.",
    images: ["/images/og-dashboard.png"],
  },
};

const UserDashboard = () => {
  return (
    <div>
      <UserDashboardPage />
    </div>
  );
};

export default UserDashboard;

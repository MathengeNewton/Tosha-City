import UserDashboardPage from "./UserDashboard";

export const metadata = {
  title: "User Dashboard | PCEA Church Kenya",
  description:
    "Access your personal dashboard at PCEA Church Kenya. View your account details, member services, and personalized ministry resources.",
  icons: {
    icon: "/pcea-seeklogo.svg",
    shortcut: "/icons/favicon-16x16.png",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "User Dashboard | PCEA Church Kenya",
    description:
      "Securely manage your PCEA Church Kenya account and access member-specific resources through your dashboard.",
    url: "https://pceachurch.or.ke/dashboard/user",
    siteName: "PCEA Church Kenya",
    type: "website",
    images: [
      {
        url: "/images/og-dashboard.png",
        width: 1200,
        height: 630,
        alt: "PCEA Church Kenya User Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "User Dashboard | PCEA Church Kenya",
    description:
      "Access your personal dashboard to view account details and member services at PCEA Church Kenya.",
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

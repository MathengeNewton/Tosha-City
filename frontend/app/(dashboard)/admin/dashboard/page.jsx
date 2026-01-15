import AdminDashboardPage from "./AdminDashboard";

// app/dashboard/admin/page.js or page.tsx

export const metadata = {
  title: "Admin Dashboard | PCEA Church Kenya",
  description:
    "Manage PCEA Church Kenya's administrative operations securely. Access member management, church events, and ministry resources from the admin portal.",
  icons: {
    icon: "/pcea-seeklogo.svg",
    shortcut: "/icons/favicon-16x16.png",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "Admin Dashboard | PCEA Church Kenya",
    description:
      "Access the PCEA Church Kenya admin portal to manage members, events, and church resources securely.",
    url: "https://pceachurch.or.ke/dashboard/admin",
    siteName: "PCEA Church Kenya",
    type: "website",
    images: [
      {
        url: "/images/og-admin-dashboard.png",
        width: 1200,
        height: 630,
        alt: "PCEA Church Kenya Admin Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Admin Dashboard | PCEA Church Kenya",
    description:
      "Securely manage PCEA Church Kenya operations including members, events, and resources through the admin dashboard.",
    images: ["/images/og-admin-dashboard.png"],
  },
};

const AdminDashboard = () => {
  return (
    <>
      <AdminDashboardPage />
    </>
  );
};
export default AdminDashboard;

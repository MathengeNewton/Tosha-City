import AdminDashboardPage from "./AdminDashboard";

export const metadata = {
  title: "Admin home | LakeTown Butchery",
  description:
    "Management overview — branches, users, and reporting for LakeTown Butchery.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "Admin home | LakeTown Butchery",
    description:
      "Access the LakeTown Butchery admin portal to manage branches, stock, and operations.",
    url: "https://admin.laketown.co.ke/admin/dashboard",
    siteName: "LakeTown Butchery",
    type: "website",
    images: [
      {
        url: "/images/og-admin-dashboard.png",
        width: 1200,
        height: 630,
        alt: "LakeTown Butchery Admin Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Admin home | LakeTown Butchery",
    description:
      "Manage LakeTown Butchery operations from the admin dashboard.",
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

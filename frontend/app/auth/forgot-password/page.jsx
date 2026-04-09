import ForgotPasswordPage from "./ForgotPassword";

export const metadata = {
  title: "Forgot Password | LakeTown Butchery",
  description:
    "Reset your LakeTown Butchery account password securely and regain access to the management system.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "Forgot Password | LakeTown Butchery",
    description:
      "Use this secure portal to reset your LakeTown Butchery account password.",
    url: "https://admin.laketown.co.ke/forgot-password",
    siteName: "LakeTown Butchery",
    type: "website",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "LakeTown Butchery",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Forgot Password | LakeTown Butchery",
    description:
      "Reset your LakeTown Butchery account password securely through our portal.",
    images: ["/images/og-image.png"],
  },
};

const ForgotPassword = () => {
  return (
    <>
      <ForgotPasswordPage />
    </>
  );
};

export default ForgotPassword;

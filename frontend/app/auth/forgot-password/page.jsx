import ForgotPasswordPage from "./ForgotPassword";

export const metadata = {
  title: "Forgot Password | PCEA Church Kenya",
  description:
    "Reset your PCEA Church Kenya account password securely and regain access to your member or admin portal.",
  icons: {
    icon: "/pcea-seeklogo.svg",
    shortcut: "/icons/favicon-16x16.png",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "Forgot Password | PCEA Church Kenya",
    description:
      "Use this secure portal to reset your PCEA Church Kenya account password.",
    url: "https://pceachurch.or.ke/forgot-password",
    siteName: "PCEA Church Kenya",
    type: "website",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "PCEA Church Kenya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Forgot Password | PCEA Church Kenya",
    description:
      "Reset your PCEA Church Kenya account password securely through our portal.",
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

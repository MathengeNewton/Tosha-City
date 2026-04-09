import Image from "next/image";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata = {
  title: "Reset Password | LakeTown Butchery",
  description:
    "Create a new password for your LakeTown Butchery account and regain secure access to the portal.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "Reset Password | LakeTown Butchery",
    description:
      "Securely set a new password for your LakeTown Butchery account through the official reset portal.",
    url: "https://admin.laketown.co.ke/reset-password",
    siteName: "LakeTown Butchery",
    type: "website",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "LakeTown Butchery password reset",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Reset Password | LakeTown Butchery",
    description:
      "Use this secure portal to set a new password for your LakeTown Butchery account.",
    images: ["/images/og-image.png"],
  },
};

export default function ResetPasswordPage() {
  return (
    <div className="bg-gray-100 lg:h-screen flex items-center justify-center p-4">
      <div className="max-w-6xl bg-white [box-shadow:0_2px_10px_-3px_rgba(6,81,237,0.3)] p-4 lg:p-5 rounded-md">
        <div className="grid md:grid-cols-2 items-center gap-y-8">
          <ResetPasswordForm />
          <div className="w-full h-full">
            <div className="aspect-square bg-gray-50 relative before:absolute before:inset-0 before:bg-indigo-600/30 rounded-md overflow-hidden w-full h-full">
              <Image
                width={600}
                height={600}
                src="/reset-password.jpg"
                className="w-full h-full object-cover"
                alt="reset password img"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

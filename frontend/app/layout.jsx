import "./globals.css";
import { Albert_Sans } from "next/font/google";
import { AuthProvider } from "../contexts/AuthContext";

const albertSans = Albert_Sans({
  variable: "--font-albert-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata = {
  title: "ToshaCity Butchery | Management System",
  description:
    "ToshaCity Butchery Management System — Manage stock, sales, and daily operations for your butchery business.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "ToshaCity Butchery | Management System",
    description:
      "Manage your butchery operations efficiently. Track stock, sales, wastage, and generate comprehensive reports.",
    url: "https://admin.toshacity.co.ke",
    siteName: "ToshaCity Butchery",
    type: "website",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "ToshaCity Butchery Management System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ToshaCity Butchery | Management System",
    description:
      "Manage your butchery operations efficiently. Track stock, sales, wastage, and generate comprehensive reports.",
    images: ["/images/og-image.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${albertSans.variable} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { OfflineIndicator } from "@/components/molecules/OfflineIndicator";
import { ServiceWorkerRegister } from "@/components/organisms/ServiceWorkerRegister";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#131620",
};

export const metadata: Metadata = {
  title: "SaveMe — Smart & Private Personal Finance Tracker",
  description: "Kelola keuangan pribadi tanpa ribet. Catat pemasukan, pantau pengeluaran, dan raih kebebasan finansial dengan privasi 100% terjaga.",
  keywords: ["personal finance", "catatan keuangan", "budget tracker", "expense manager", "SaveMe", "PWA"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SaveMe",
  },
  icons: {
    icon: "/globe.svg",
    apple: "/globe.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} dark antialiased scroll-smooth`}>
      <body className="min-h-screen bg-[#0f1117] text-[#f1f5f9] flex flex-col selection:bg-green-500/30 selection:text-green-300">
        <AuthProvider>
          <OfflineIndicator />
          <ServiceWorkerRegister />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

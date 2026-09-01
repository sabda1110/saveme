import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
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
  themeColor: "#22c55e",
};

export const metadata: Metadata = {
  title: "SaveMe — Smart & Private Personal Finance Tracker",
  description: "Kelola keuangan pribadi tanpa ribet. Catat pemasukan, pantau pengeluaran, dan raih kebebasan finansial dengan privasi 100% terjaga.",
  keywords: ["personal finance", "catatan keuangan", "budget tracker", "expense manager", "SaveMe", "PWA"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SaveMe",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
  },
};

const themeScript = `
  (function() {
    try {
      var stored = localStorage.getItem('saveme_theme');
      if (stored === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} antialiased scroll-smooth`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] flex flex-col selection:bg-green-500/30 selection:text-green-600 dark:selection:text-green-300">
        <ThemeProvider>
          <AuthProvider>
            <OfflineIndicator />
            <ServiceWorkerRegister />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

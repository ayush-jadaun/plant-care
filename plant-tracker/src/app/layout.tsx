import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Plant Tracker",
  description: "Interactive plant health monitoring dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-gray-950 text-white min-h-screen">
        <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
          <span className="text-lg font-bold flex items-center gap-2">
            🌱 Plant Tracker
          </span>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            Dashboard
          </Link>
          <Link href="/analytics" className="text-sm text-gray-400 hover:text-white transition-colors">
            Analytics
          </Link>
          <Link href="/settings" className="text-sm text-gray-400 hover:text-white transition-colors">
            Settings
          </Link>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

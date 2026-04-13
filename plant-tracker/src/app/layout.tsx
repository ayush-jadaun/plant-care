import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Leaf, BarChart3, Settings } from "lucide-react";
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

function NavLink({
  href,
  children,
  icon: Icon,
}: {
  href: string;
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-200"
    >
      <Icon className="size-4" />
      {children}
    </Link>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen antialiased">
        <TooltipProvider>
          <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 ring-1 ring-primary/20">
                  <Leaf className="size-4 text-primary" />
                </div>
                <span className="text-sm font-semibold tracking-tight">
                  Plant Tracker
                </span>
              </Link>
              <div className="flex items-center gap-1">
                <NavLink href="/" icon={Leaf}>Dashboard</NavLink>
                <NavLink href="/analytics" icon={BarChart3}>Analytics</NavLink>
                <NavLink href="/settings" icon={Settings}>Settings</NavLink>
              </div>
            </div>
          </nav>
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
        </TooltipProvider>
      </body>
    </html>
  );
}

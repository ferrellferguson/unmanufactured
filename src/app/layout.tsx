import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { FeedbackButton } from "@/components/feedback/feedback-button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Unmanufactured — Narrative Drift Tracker",
  description:
    "All facts, no manufacturing. Track how AI models narrate news events over time and detect when narratives shift without new facts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <header className="border-b border-border">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight">
                UNMANUFACTURED
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                .org
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Events
              </Link>
              <Link
                href="/events/new"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                + New Event
              </Link>
              <FeedbackButton />
            </nav>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">{children}</main>
        <Analytics />
      </body>
    </html>
  );
}

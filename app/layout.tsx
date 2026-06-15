import type { Metadata } from "next";
import {
  Plus_Jakarta_Sans,
  JetBrains_Mono,
} from "next/font/google";

import Navbar from "@/components/Navbar";
import BetaBanner from "@/components/BetaBanner";

import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "StudyGrouprr",
  description:
    "Find classmates, join study groups, and collaborate on campus.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakarta.variable} ${mono.variable}`}
    >
      <body
        className={`${jakarta.className} min-h-screen bg-slate-50 text-slate-900 antialiased`}
      >
        <div className="relative flex min-h-screen flex-col">
          {/* Background Glow */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-purple-500/10 blur-3xl" />
          </div>

          <div className="relative flex min-h-screen flex-col">
  <BetaBanner />

  <Navbar />

  <main className="flex-1">
    {children}
  </main>
</div>
        </div>
      </body>
    </html>
  );
}
import type { Metadata } from "next";
import { Geist, Great_Vibes } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { SessionIdle } from "@/components/session-idle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const script = Great_Vibes({
  variable: "--font-great-vibes",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Volunteer",
  description: "Make a difference wherever you go.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${script.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper">
        <SessionIdle />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  description: "Noted is a high school messaging app with secure Supabase authentication.",
  manifest: "/manifest.webmanifest",
  title: "Noted"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

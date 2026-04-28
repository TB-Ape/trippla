import type { Metadata, Viewport } from "next";
import "./globals.css";
import SessionProvider from "@/components/session-provider";
import { PushSetup } from "@/components/PushSetup";

export const metadata: Metadata = {
  title: "Trippla - Plan Your Perfect Group Trip",
  description: "Collaborative trip planning made easy. Create itineraries, track expenses, and coordinate with your travel group.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Trippla",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <SessionProvider>
          <PushSetup />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}

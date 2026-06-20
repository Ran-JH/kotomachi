import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AlphaAccessGate } from "./alpha-access-gate";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Kotomachi",
  description: "Low-pressure Japanese speaking practice",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kotomachi",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192-v3.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512-v3.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: [{ url: "/icons/icon-192-v3.png", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon-v3.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1E2A16",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-[#F3EDE0] text-[#2D4A1F] min-h-screen antialiased">
        <AlphaAccessGate>{children}</AlphaAccessGate>
        <Analytics />
      </body>
    </html>
  );
}

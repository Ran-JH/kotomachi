import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AlphaAccessGate } from "./alpha-access-gate";

export const metadata: Metadata = {
  title: "Kotomachi / 言街",
  description: "Low-pressure Japanese speaking practice",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kotomachi",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/avatars/misaki_avatar.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/avatars/misaki_avatar.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1E2A16",
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
      </body>
    </html>
  );
}

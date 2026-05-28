import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "言街 (Kotomachi)",
  description: "静かな街角で、日本語をゆっくり話そう。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-[#F3EDE0] text-[#2D4A1F] min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}

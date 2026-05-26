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
      <head>
        {/* Google Fonts: Noto Serif JP + Noto Sans JP */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500&family=Noto+Serif+JP:wght@300&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#F3EDE0] text-[#2D4A1F] min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}

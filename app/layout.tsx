import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SSG質問アプリ",
  description: "学習指導要領に沿って、3段階のヒントで答えを導くアプリ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100">
        {children}
      </body>
    </html>
  );
}

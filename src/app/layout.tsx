import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atoms - AI-Powered Development Platform",
  description: "Build applications with AI assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}

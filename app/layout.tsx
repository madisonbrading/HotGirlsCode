import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hot Girls Code",
  description: "Tell me what you want to build or learn — I'll walk you through it step by step.",
  metadataBase: new URL("https://hotgirlscode.codes"),
  openGraph: {
    title: "Hot Girls Code",
    description: "AI-powered coding tutor. Build anything, step by step.",
    url: "https://hotgirlscode.codes",
    siteName: "Hot Girls Code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

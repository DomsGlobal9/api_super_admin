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
  title: "ScaleEasy Super Admin",
  description: "Centralized API Management & Gateway Dashboard",
  icons: {
    icon: "/favicon.ico",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full print:h-auto antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full print:min-h-0 flex flex-col print:block" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
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
  metadataBase: new URL('https://capitoltrades.app'),
  title: {
    default: 'CapitolTrades — Track Congressional Stock Trades',
    template: '%s | CapitolTrades',
  },
  description: 'Track congressional trades, search politicians, and monitor market transparency from Capitol Hill.',
  openGraph: {
    title: 'CapitolTrades — Track Congressional Stock Trades',
    description: 'Track congressional trades, search politicians, and monitor market transparency from Capitol Hill.',
    url: 'https://capitoltrades.app',
    siteName: 'CapitolTrades',
    locale: 'en_US',
    type: 'website',
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
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}

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
  metadataBase: new URL("https://ctf.firecrawl.dev"),
  title: "Firecrawl CTF",
  description: "10 problems. 45 seconds. Good luck.",
  openGraph: {
    title: "Firecrawl CTF",
    description: "10 problems. 45 seconds. Good luck.",
    url: "https://ctf.firecrawl.dev",
    siteName: "Firecrawl CTF",
    images: [{ url: "/opengraph-image" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

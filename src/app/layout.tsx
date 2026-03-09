import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Nav from "./_components/nav";
import { Toaster } from "@/components/ui/toaster";
import Providers from "./_components/Providers";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "RECXRD - Own Your Narrative",
  description: "The AI-powered source of truth for musicians. Aggregate your scattered lore, interviews, and history into one verified, machine-readable archive.",
  openGraph: {
    type: "website",
    url: "https://recxrd.xyz",
    title: "RECXRD - Own Your Narrative",
    description: "The AI-powered source of truth for musicians. Aggregate your scattered lore, interviews, and history into one verified, machine-readable archive.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RECXRD",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RECXRD - Own Your Narrative",
    description: "The AI-powered source of truth for musicians.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/icon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans min-h-screen flex flex-col`}>
        <Providers>
          <Nav />
          <main className="flex-grow flex flex-col min-h-0">
            {children}
          </main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

import PreviewExplorationShell from "./_components/exploration/PreviewExplorationShell";
import { previewApiUrl } from "@/lib/intent/previewApiUrl";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "./_components/nav";
import { Toaster } from "@/components/ui/toaster";
import Footer from "./_components/Footer";
import Providers from "./_components/Providers";
import ThemeScript from "./_components/ThemeScript";
import { Analytics } from "@vercel/analytics/next";
import { socialPreviewImage } from "@/lib/socialPreviewImage";
import { socialPreviewTitle } from "@/lib/socialPreviewTitle";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Music Nerd",
  description: "A crowd-sourced directory of music artists",
  openGraph: {
    type: "website",
    url: "https://musicnerd.net",
    title: socialPreviewTitle,
    description: "A crowd-sourced directory of music artists",
    images: [socialPreviewImage],
  },
  twitter: {
    card: "summary_large_image",
    site: "@musicnerdnet",
    title: socialPreviewTitle,
    description: "A crowd-sourced directory of music artists",
    images: [socialPreviewImage.url],
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen flex flex-col">
        <Providers>
          {previewApiUrl() ? (
            <PreviewExplorationShell>{children}</PreviewExplorationShell>
          ) : (
            <>
              <Nav />
              <main className="flex-grow flex flex-col min-h-0 w-full">
                {children}
              </main>
              <Footer />
            </>
          )}
          <Toaster />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}

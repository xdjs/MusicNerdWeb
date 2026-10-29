import { previewApiUrl } from "@/lib/intent/previewApiUrl";
import type { Metadata } from "next";
import HomePageSplash from "./_components/HomePageSplash";
import { socialPreviewImage } from "@/lib/socialPreviewImage";
import { socialPreviewTitle } from "@/lib/socialPreviewTitle";

export const metadata: Metadata = {
  title: "Music Nerd - Discover Artist Links & Social Media",
  description:
    "A crowd-sourced directory of music artists. Find social media links, streaming profiles, and support your favorite artists.",
  openGraph: {
    type: "website",
    url: "https://musicnerd.net",
    title: socialPreviewTitle,
    description:
      "A crowd-sourced directory of music artists. Find social media links, streaming profiles, and support your favorite artists.",
    images: [socialPreviewImage],
  },
};

export default function HomePage() {
  return previewApiUrl() ? null : <HomePageSplash />;
}

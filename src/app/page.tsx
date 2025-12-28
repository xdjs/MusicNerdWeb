import type { Metadata } from "next";
import HomePageSplash from "./_components/HomePageSplash";

export const metadata: Metadata = {
  title: "Music Nerd - Discover Artist Links & Social Media",
  description:
    "A crowd-sourced directory of music artists. Find social media links, streaming profiles, and support your favorite artists.",
  openGraph: {
    title: "Music Nerd - Discover Artist Links & Social Media",
    description:
      "A crowd-sourced directory of music artists. Find social media links, streaming profiles, and support your favorite artists.",
  },
};

export default function HomePage() {
  return <HomePageSplash animation="static" />;
}


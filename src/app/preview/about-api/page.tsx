import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PreviewNavigation from "./PreviewNavigation";
import ProfileConcept from "@/app/profile/ProfileConcept";

export const metadata: Metadata = { title: "Profile API prototype · Music Nerd", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  if (process.env.NODE_ENV !== 'development' && process.env.VERCEL_ENV !== 'preview') notFound();
  const { tab } = await searchParams;
  return <>
    <PreviewNavigation />
    <ProfileConcept apiPrototype initialApiTab={tab === 'api'} emptyPreview showcase user={{ id: 'api-design-preview', email: 'pete@example.com', wallet: null, isAdmin: false, isWhiteListed: false, isHidden: false }} />
  </>;
}

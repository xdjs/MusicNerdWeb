"use client";

import LiveUserProfile from "./LiveUserProfile";
import Link from "next/link";
import ProfileLoading from "./ProfileLoading";
import ProfileConcept from "./ProfileConcept";
import { useMusicNerdUser } from "@/hooks/useMusicNerdUser";

export default function ClientWrapper({ designPreview = false, emptyPreview = false, emptyCollection = false }: { designPreview?: boolean; emptyPreview?: boolean; emptyCollection?: boolean }) {
  const { user, status, isError, refetch } = useMusicNerdUser();

  if (status === "loading") {
    return <ProfileLoading />;
  }

  if (isError) return <div role="alert" className="mx-auto max-w-md px-5 py-12"><p>Your profile couldn’t load.</p><button className="mt-3 underline" onClick={() => void refetch()}>Try again</button></div>;

  if (process.env.NODE_ENV === "development" && designPreview && user) return <ProfileConcept user={user} emptyCollection={emptyCollection} emptyPreview={emptyPreview} />;

  if (!user) return <div className="mx-auto max-w-md px-5 py-12 text-center"><h1 className="text-2xl font-semibold">Your MusicNerd starts here</h1><p className="mt-3 text-muted-foreground">Log in to see your contributions and the artists you’ve helped.</p><Link href="/" className="mt-4 inline-block underline">Explore artists</Link></div>;
  return <LiveUserProfile key={user.id} user={user} />;
}

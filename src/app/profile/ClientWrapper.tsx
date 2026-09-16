"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import LiveUserProfile from "./LiveUserProfile";
import Link from "next/link";
import ProfileLoading from "./ProfileLoading";
import ProfileConcept from "./ProfileConcept";


type User = {
  id: string;
  wallet: string | null;
  email: string | null;
  username: string | null;
  privyUserId: string | null;
  isAdmin: boolean;
  isWhiteListed: boolean;
  isSuperAdmin: boolean;
  isHidden: boolean;
  legacyLinkDismissed: boolean;
  acceptedUgcCount: number | null;
  createdAt: string;
  updatedAt: string;
  legacyId: string | null;
};

export default function ClientWrapper({ designPreview = false, emptyPreview = false, emptyCollection = false }: { designPreview?: boolean; emptyPreview?: boolean; emptyCollection?: boolean }) {
  const { status, data: session } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setUser(null);
    setError(false);
    let cancelled = false;

    const fetchUser = async () => {
      if (status === "authenticated" && session?.user?.id) {
        try {
          const response = await fetch(`/api/user/${session.user.id}`);
          if (cancelled) return;
          if (response.ok) {
            const userData = await response.json();
            if (!cancelled) setUser(userData);
          } else if (response.status === 404) {
            if (cancelled) return;
            // JWT references a user that no longer exists in the database
            // (e.g., after DB reset or mergeAccounts() deleted a placeholder).
            // Clear the stale NextAuth session and redirect to home to avoid
            // a confusing split state (nav shows authenticated, content shows guest).
            console.warn(
              '[ClientWrapper] User not found (404) for session user ID:',
              session.user.id,
              '- signing out stale session'
            );
            try {
              await signOut({ callbackUrl: '/', redirect: true });
            } catch {
              if (!cancelled) window.location.href = '/';
            }
            return;
          } else {
            if (!cancelled) setError(true);
          }
        } catch (error) {
          console.error('Failed to fetch user:', error);
          if (!cancelled) setError(true);
        }
      } else {
        if (!cancelled) setUser(null);
      }
      if (!cancelled) setIsLoading(false);
    };

    if (status !== "loading") {
      fetchUser();
    }

    return () => { cancelled = true; };
  }, [status, session, attempt]);

  if (status === "loading" || isLoading) {
    return <ProfileLoading />;
  }

  if (error) return <div role="alert" className="mx-auto max-w-md px-5 py-12"><p>Your profile couldn’t load.</p><button className="mt-3 underline" onClick={() => setAttempt(value => value + 1)}>Try again</button></div>;

  if (process.env.NODE_ENV === "development" && designPreview && user) return <ProfileConcept user={user} emptyCollection={emptyCollection} emptyPreview={emptyPreview} />;

  if (!user) return <div className="mx-auto max-w-md px-5 py-12 text-center"><h1 className="text-2xl font-semibold">Your MusicNerd starts here</h1><p className="mt-3 text-muted-foreground">Log in to see your contributions and saved artists.</p><Link href="/" className="mt-4 inline-block underline">Explore artists</Link></div>;
  return <LiveUserProfile key={user.id} user={user} />;
}

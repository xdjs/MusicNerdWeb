"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Leaderboard from "../profile/Leaderboard";

type User = {
  id: string;
  wallet: string;
  email: string | null;
  username: string | null;
  isAdmin: boolean;
  isWhiteListed: boolean;
  isSuperAdmin: boolean;
  isHidden: boolean;
  acceptedUgcCount: number | null;
  createdAt: string;
  updatedAt: string;
  legacyId: string | null;
};

export default function LeaderboardClientWrapper() {
  const { status, data: session } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (status === "authenticated" && session?.user?.id) {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/user/${session.user.id}`);
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            // If user fetch fails, treat as guest
            setUser(null);
          }
        } catch (error) {
          console.error('Failed to fetch user:', error);
          setUser(null);
        } finally {
          setIsLoading(false);
          setHasInitialized(true);
        }
      } else if (status === "unauthenticated") {
        setUser(null);
        setIsLoading(false);
        setHasInitialized(true);
      }
    };

    if (status !== "loading") {
      fetchUser();
    }
  }, [status, session]);

  // Show loading only when we're actually fetching user data
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center gap-4">
        <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col items-center gap-4">
          <img className="h-12" src="/spinner.svg" alt="Loading" />
          <div className="text-xl text-black">Loading...</div>
        </div>
      </div>
    );
  }

  // If not authenticated, show login message
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-8 text-[#9b83a0]">Leaderboard</h1>
          <p className="text-lg text-gray-600">Please log in to view the leaderboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Leaderboard highlightIdentifier={user.username || user.wallet} />
      </div>
    </div>
  );
}

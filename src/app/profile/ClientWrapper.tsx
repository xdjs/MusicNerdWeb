"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Dashboard from "@/app/profile/Dashboard";

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

export default function ClientWrapper() {
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

  // Guest user object
  const guestUser: User = {
    id: '00000000-0000-0000-0000-000000000000',
    wallet: '0x0000000000000000000000000000000000000000',
    email: null,
    username: 'Guest User',
    isAdmin: false,
    isWhiteListed: false,
    isSuperAdmin: false,
    isHidden: false,
    acceptedUgcCount: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    legacyId: null,
  };

  const currentUser = user || guestUser;

  return (
    <main className="px-5 sm:px-10 py-10">
      <Dashboard 
        key={`dashboard-${currentUser.id}`}
        user={currentUser} 
        allowEditUsername={true} 
        showLeaderboard={false} 
        showDateRange={true} 
        hideLogin={false} 
        showStatus={true} 
      />
    </main>
  );
}

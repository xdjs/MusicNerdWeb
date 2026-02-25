"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Dashboard from "@/app/profile/Dashboard";
import Leaderboard from "@/app/profile/Leaderboard";
import AutoRefresh from "@/app/_components/AutoRefresh";

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

export default function ClientWrapper() {
  const { status, data: session } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<"today" | "week" | "month" | "all">("today");

  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      if (status === "authenticated" && session?.user?.id) {
        try {
          const response = await fetch(`/api/user/${session.user.id}`);
          if (cancelled) return;
          if (response.ok) {
            const userData = await response.json();
            if (!cancelled) setUser(userData);
          } else {
            if (!cancelled) setUser(null);
          }
        } catch (error) {
          console.error('Failed to fetch user:', error);
          if (!cancelled) setUser(null);
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
  }, [status, session]);

  if (status === "loading" || isLoading) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center gap-4">
        <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col items-center gap-4">
          <img className="h-12" src="/spinner.svg" alt="Loading" />
          <div className="text-xl text-black">Loading...</div>
        </div>
      </div>
    );
  }

  const guestUser: User = {
    id: '00000000-0000-0000-0000-000000000000',
    wallet: '0x0000000000000000000000000000000000000000',
    email: null,
    username: 'Guest User',
    privyUserId: null,
    isAdmin: false,
    isWhiteListed: false,
    isSuperAdmin: false,
    isHidden: false,
    legacyLinkDismissed: false,
    acceptedUgcCount: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    legacyId: null,
  };

  const currentUser = user || guestUser;

  const handleRangeChange = (range: "today" | "week" | "month" | "all") => {
    setSelectedRange(range);
  };

  return (
    <main className="px-5 sm:px-10 py-10">
      <AutoRefresh />
      <Dashboard
        user={currentUser}
        allowEditUsername={false}
        showLeaderboard={false}
        showDateRange={false}
        hideLogin={true}
        showStatus={false}
        selectedRange={selectedRange}
      />
      <Leaderboard
        highlightIdentifier={currentUser.username || currentUser.wallet || undefined}
        onRangeChange={handleRangeChange}
      />
    </main>
  );
}

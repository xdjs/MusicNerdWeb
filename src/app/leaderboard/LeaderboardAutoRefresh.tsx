"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

/**
 * Consolidated auto-refresh component that handles session state mismatches
 * between server-side and client-side rendering. Shows loading state instead of immediate reload.
 */
export default function LeaderboardAutoRefresh() {
  const { status } = useSession();
  const prevStatus = useRef<typeof status | null>(null);
  const hasReloaded = useRef(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const skip = sessionStorage.getItem("autoRefreshSkip") === "true";

    // Only reload once per session to avoid infinite loops
    if (hasReloaded.current) {
      return;
    }

    const isStable = status !== "loading";

    // Only reload if there's a clear auth state transition, not on initial load
    if (!skip && isStable && prevStatus.current !== null && prevStatus.current !== status) {
      console.debug('[AutoRefresh] Auth state transition detected, showing loading state');
      setIsLoading(true);
      hasReloaded.current = true;
      sessionStorage.setItem("autoRefreshSkip", "true");
      
      // Delay reload to show loading state
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }

    // Clear skip flag after a delay to allow future auth changes
    if (skip && isStable) {
      setTimeout(() => {
        sessionStorage.removeItem("autoRefreshSkip");
        hasReloaded.current = false;
      }, 2000);
    }

    // Update previous status
    if (isStable) {
      prevStatus.current = status;
    }
  }, [status]);

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

  return null;
} 
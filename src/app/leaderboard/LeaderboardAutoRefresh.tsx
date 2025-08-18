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

    // Detect state mismatch: if we're authenticated but the page shows guest/loading state
    const shouldRefresh = !skip && isStable && (
      // Case 1: Authentication transition
      (prevStatus.current === "unauthenticated" && status === "authenticated") ||
      // Case 2: State mismatch detection - if we're authenticated but page shows guest elements
      (status === "authenticated" && document.querySelector('[data-guest-user="true"]') !== null) ||
      // Case 3: Navigation after login - if we're authenticated but this is a fresh page load
      (status === "authenticated" && prevStatus.current === null)
    );

    if (shouldRefresh) {
      console.debug('[AutoRefresh] State mismatch or authentication detected, showing loading state');
      setIsLoading(true);
      hasReloaded.current = true;
      sessionStorage.setItem("autoRefreshSkip", "true");
      
      // Delay reload to show loading state
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }

    // Clear skip flag after a delay to allow future auth changes
    if (skip && isStable) {
      setTimeout(() => {
        sessionStorage.removeItem("autoRefreshSkip");
        hasReloaded.current = false;
      }, 1000);
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
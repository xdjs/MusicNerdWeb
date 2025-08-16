"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

/**
 * Consolidated auto-refresh component that handles session state mismatches
 * between server-side and client-side rendering. This replaces the separate
 * auto-refresh logic in Dashboard.tsx and provides a single point of control.
 */
export default function LeaderboardAutoRefresh() {
  const { status } = useSession();
  const prevStatus = useRef<typeof status | null>(null);
  const hasReloaded = useRef(false);

  useEffect(() => {
    const skip = sessionStorage.getItem("autoRefreshSkip") === "true";

    // Only reload once per session to avoid infinite loops
    if (hasReloaded.current) {
      return;
    }

    const isStable = status !== "loading";

    // Handle initial page load mismatch - only for leaderboard/profile pages
    if (!skip && isStable && prevStatus.current === null) {
      // Check if we're on a leaderboard or profile page that needs SSR/client consistency
      const isLeaderboardPage = window.location.pathname.includes('/leaderboard') || 
                               window.location.pathname.includes('/profile');
      
      // Only reload on initial load for leaderboard/profile pages
      if (isLeaderboardPage) {
        console.debug('[AutoRefresh] Initial leaderboard page load detected, reloading to ensure SSR/client consistency');
        hasReloaded.current = true;
        sessionStorage.setItem("autoRefreshSkip", "true");
        window.location.reload();
        return;
      }
    }

    // Detect session state mismatch between SSR and client
    const hasPreviousStatus = prevStatus.current !== null;
    const statusChanged = hasPreviousStatus && prevStatus.current !== status;

    // Only reload if we have a clear mismatch and haven't already reloaded
    if (!skip && hasPreviousStatus && statusChanged && isStable) {
      console.debug('[AutoRefresh] Session state mismatch detected, reloading page');
      hasReloaded.current = true;
      sessionStorage.setItem("autoRefreshSkip", "true");
      window.location.reload();
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

  return null;
} 
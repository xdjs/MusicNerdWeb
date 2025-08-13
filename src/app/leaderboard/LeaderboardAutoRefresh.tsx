"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

export default function LeaderboardAutoRefresh() {
  const { status } = useSession();
  const prevStatus = useRef<typeof status | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const skip = sessionStorage.getItem("leaderboardSkipReload") === "true";

    // Detect both a transition after mount and the common case where SSR rendered
    // unauthenticated but the client immediately has an authenticated session.
    const transitioned = prevStatus.current && prevStatus.current !== status && status !== "loading";
    const firstAuthenticated = prevStatus.current === null && status === "authenticated";
    const firstUnauthenticated = prevStatus.current === null && status === "unauthenticated";

    if (!skip && (transitioned || firstAuthenticated || firstUnauthenticated)) {
      sessionStorage.setItem("leaderboardSkipReload", "true");
      // Show a brief overlay so the user sees feedback instead of a white flash
      setShowOverlay(true);
      setTimeout(() => {
        window.location.reload();
      }, 50);
    }

    if (skip && status !== "loading") {
      sessionStorage.removeItem("leaderboardSkipReload");
    }

    if (status !== "loading") {
      prevStatus.current = status;
    }
  }, [status]);

  // Also show overlay while the session library reports loading
  if (showOverlay || status === "loading") {
    return (
      <div className="fixed inset-0 z-[9999] bg-white/95 flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#9b83a0] font-semibold">
          <img className="h-6 w-6" src="/spinner.svg" alt="Loading..." />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return null;
}
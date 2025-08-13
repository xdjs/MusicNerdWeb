"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export default function LeaderboardAutoRefresh() {
  const { status } = useSession();
  const prevStatus = useRef<typeof status | null>(null);

  useEffect(() => {
    const skip = sessionStorage.getItem("leaderboardSkipReload") === "true";

    // Detect both a transition after mount and the common case where SSR rendered
    // unauthenticated but the client immediately has an authenticated session.
    const transitioned = prevStatus.current && prevStatus.current !== status && status !== "loading";
    const firstAuthenticated = prevStatus.current === null && status === "authenticated";
    const firstUnauthenticated = prevStatus.current === null && status === "unauthenticated";

    if (!skip && (transitioned || firstAuthenticated || firstUnauthenticated)) {
      sessionStorage.setItem("leaderboardSkipReload", "true");
      window.location.reload();
    }

    if (skip && status !== "loading") {
      sessionStorage.removeItem("leaderboardSkipReload");
    }

    if (status !== "loading") {
      prevStatus.current = status;
    }
  }, [status]);

  return null;
} 
"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";

/**
 * Universal auto-refresh component that triggers a page refresh when the user signs in
 * to ensure server components pick up the new session data immediately.
 * Uses sessionStorage to prevent multiple refreshes.
 *
 * @param sessionStorageKey - Optional custom key for sessionStorage (defaults to "autoRefreshSkipReload")
 * @param showLoading - Whether to show loading state (defaults to true)
 */
export default function AutoRefresh({
  sessionStorageKey = "autoRefreshSkipReload",
  showLoading = true
}: {
  sessionStorageKey?: string;
  showLoading?: boolean;
} = {}) {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const hasTriggeredRefresh = useRef(false);
  const [isClient, setIsClient] = useState(false);
  const prevStatus = useRef<string | null>(null);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Show loading state while session is being determined
  useEffect(() => {
    if (showLoading) {
      if (status === "loading") {
        setIsLoading(true);
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [status, showLoading]);

  // Handle authentication state changes - immediate refresh
  useEffect(() => {
    // Skip if not on client side or if we've already triggered a refresh
    if (!isClient || hasTriggeredRefresh.current) {
      return;
    }

    // Check if we've transitioned to authenticated state
    const hasTransitionedToAuthenticated =
      prevStatus.current &&
      prevStatus.current !== "authenticated" &&
      status === "authenticated" &&
      session?.user?.id;

    // If we have a session and we're authenticated, trigger refresh
    if (session && status === "authenticated" && session.user?.id) {
      try {
        const skipRefresh = sessionStorage.getItem(sessionStorageKey) === "true";

        if (!skipRefresh || hasTransitionedToAuthenticated) {
          // Mark that we've triggered a refresh immediately
          hasTriggeredRefresh.current = true;
          sessionStorage.setItem(sessionStorageKey, "true");

          // Immediate refresh
          window.location.reload();
        }
      } catch (error) {
        console.error("[AutoRefresh] Error accessing sessionStorage:", error);
      }
    }

    // Update previous status
    prevStatus.current = status;
  }, [session, status, sessionStorageKey, isClient]);

  if (isLoading || status === "loading") {
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

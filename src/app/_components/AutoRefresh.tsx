"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";

/**
 * Universal auto-refresh component that triggers a page reload when the user signs in
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
  const { status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const prevStatus = useRef<typeof status | null>(null);

  useEffect(() => {
    if (showLoading) {
      // Show loading for a brief moment to ensure session is stable
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 100);

      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, [status, showLoading]);

  useEffect(() => {
    const skip = sessionStorage.getItem(sessionStorageKey) === "true";

    // Check if we need to refresh on initial load or status change
    if (!skip && status !== "loading") {
      // On initial load, prevStatus.current will be null, so we check if we're authenticated
      // On subsequent loads, we check if status changed from unauthenticated to authenticated
      const shouldRefresh = 
        (prevStatus.current === null && status === "authenticated") || // Initial load with auth
        (prevStatus.current && prevStatus.current !== status && status === "authenticated") || // Status change to auth
        (prevStatus.current === "unauthenticated" && status === "authenticated"); // Direct transition from unauthenticated to authenticated
      
      if (shouldRefresh) {
        sessionStorage.setItem(sessionStorageKey, "true");
        // Full reload so server components pick up the new session instantly
        window.location.reload();
      }
    }

    if (skip && status !== "loading") {
      // Clear flag once the page has stabilized
      sessionStorage.removeItem(sessionStorageKey);
    }

    if (status !== "loading") {
      prevStatus.current = status;
    }
  }, [status, sessionStorageKey]);

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

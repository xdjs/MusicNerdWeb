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
  const { status, data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const prevStatus = useRef<typeof status | null>(null);
  const sessionStableRef = useRef(false);
  const hasInitialized = useRef(false);

  // Only show loading on initial mount, not on every status change
  useEffect(() => {
    if (!hasInitialized.current && showLoading) {
      hasInitialized.current = true;
      setIsLoading(true);
      
      // Show loading for a brief moment to ensure session is stable
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [showLoading]);

  useEffect(() => {
    const skip = sessionStorage.getItem(sessionStorageKey) === "true";

    // Only proceed if we're not in loading state and have a stable session
    if (status !== "loading" && session) {
      sessionStableRef.current = true;
    }

    // Check if we need to refresh on initial load or status change
    if (!skip && status !== "loading" && sessionStableRef.current && hasInitialized.current) {
      // On initial load, prevStatus.current will be null, so we check if we're authenticated
      // On subsequent loads, we check if status changed from unauthenticated to authenticated
      const shouldRefresh = 
        (prevStatus.current && prevStatus.current !== status && status === "authenticated"); // Status change to auth
      
      if (shouldRefresh) {
        // Add a small delay to ensure session is fully established
        const timer = setTimeout(() => {
          console.debug('[AutoRefresh] Triggering page reload after authentication');
          sessionStorage.setItem(sessionStorageKey, "true");
          // Full reload so server components pick up the new session instantly
          window.location.reload();
        }, 500); // 500ms delay to ensure session stability

        return () => clearTimeout(timer);
      }
    }

    if (skip && status !== "loading") {
      // Clear flag once the page has stabilized
      sessionStorage.removeItem(sessionStorageKey);
    }

    if (status !== "loading") {
      prevStatus.current = status;
    }
  }, [status, session, sessionStorageKey]);

  // Only show loading screen if we're in the initial loading state
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

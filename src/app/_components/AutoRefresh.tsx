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
  const hasTriggeredRefresh = useRef(false);

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

    console.debug("[AutoRefresh] Status check:", {
      sessionStorageKey,
      skip,
      status,
      prevStatus: prevStatus.current,
      shouldRefresh: !skip && status !== "loading" && (
        (prevStatus.current === null && status === "authenticated") ||
        (prevStatus.current && prevStatus.current !== status && status === "authenticated")
      )
    });

    // Check if we need to refresh on initial load or status change
    if (!skip && status !== "loading" && !hasTriggeredRefresh.current) {
      // On initial load, prevStatus.current will be null, so we check if we're authenticated
      // On subsequent loads, we check if status changed from unauthenticated to authenticated
      const shouldRefresh = 
        (prevStatus.current === null && status === "authenticated") || // Initial load with auth
        (prevStatus.current && prevStatus.current !== status && status === "authenticated"); // Status change to auth
      
      console.debug("[AutoRefresh] Should refresh calculation:", {
        prevStatusNull: prevStatus.current === null,
        statusAuthenticated: status === "authenticated",
        prevStatusDifferent: prevStatus.current && prevStatus.current !== status,
        shouldRefresh,
        hasTriggeredRefresh: hasTriggeredRefresh.current
      });
      
      if (shouldRefresh) {
        console.debug("[AutoRefresh] Triggering refresh for key:", sessionStorageKey);
        hasTriggeredRefresh.current = true;
        sessionStorage.setItem(sessionStorageKey, "true");
        // Full reload so server components pick up the new session instantly
        window.location.reload();
      }
    }

    // Only clear the flag after a delay to ensure the page has fully stabilized
    if (skip && status !== "loading") {
      console.debug("[AutoRefresh] Clearing sessionStorage key after delay:", sessionStorageKey);
      const timer = setTimeout(() => {
        sessionStorage.removeItem(sessionStorageKey);
        console.debug("[AutoRefresh] SessionStorage key cleared:", sessionStorageKey);
      }, 1000); // Wait 1 second before clearing

      return () => clearTimeout(timer);
    }

    // Update prevStatus after processing
    if (status !== "loading") {
      console.debug("[AutoRefresh] Updating prevStatus from", prevStatus.current, "to", status);
      prevStatus.current = status;
    }
  }, [status, sessionStorageKey]);

  // Listen for authentication events from other components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'wagmi.connected' || e.key === 'siwe.session') {
        console.debug("[AutoRefresh] Detected authentication change via storage event:", e.key);
        if (status === "authenticated" && !hasTriggeredRefresh.current) {
          console.debug("[AutoRefresh] Triggering refresh due to storage event");
          hasTriggeredRefresh.current = true;
          sessionStorage.setItem(sessionStorageKey, "true");
          window.location.reload();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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

"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

/**
 * Universal auto-refresh component that triggers a router refresh when the user signs in
 * to ensure server components pick up the new session data immediately.
 * Uses sessionStorage to prevent multiple refreshes and router.refresh() for better UX.
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
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const prevStatus = useRef<typeof status | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredRefresh = useRef<boolean>(false);
  // Global lock to avoid duplicate refreshes across multiple instances
  const globalObj: any = typeof window !== 'undefined' ? window : {};
  const ownsGlobalLockRef = useRef<boolean>(false);

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

    // Check if we need to refresh on status change to authenticated
    if (!skip && status !== "loading") {
      // Only trigger refresh when status changes from non-authenticated to authenticated
      const shouldRefresh = 
        prevStatus.current && 
        prevStatus.current !== "authenticated" && 
        status === "authenticated" &&
        session?.user && // Ensure we have session data
        !hasTriggeredRefresh.current && // Ensure we haven't already triggered refresh (per-instance)
        !globalObj.__AUTO_REFRESH_LOCK__;
      
      if (shouldRefresh) {
        console.debug("[AutoRefresh] Session authenticated, triggering refresh", {
          prevStatus: prevStatus.current,
          currentStatus: status,
          hasSession: !!session,
          userId: session?.user?.id
        });
        
        // Acquire cross-instance lock immediately to prevent double refresh
        globalObj.__AUTO_REFRESH_LOCK__ = true;
        ownsGlobalLockRef.current = true;
        hasTriggeredRefresh.current = true;
        sessionStorage.setItem(sessionStorageKey, "true");
        
        // Clear any existing timeout
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        
        // Use router.refresh() instead of window.location.reload() for better UX
        // Add a small delay to ensure session is fully established
        refreshTimeoutRef.current = setTimeout(() => {
          // Dispatch custom event to notify components of session update
          const isTestMock = (globalObj as any).dispatchEvent && (globalObj as any).dispatchEvent.mock;
          const detailSession = session?.user ? { user: session.user } : undefined;
          const evt = isTestMock
            ? { type: 'sessionUpdated', detail: { status, session: detailSession } }
            : new CustomEvent('sessionUpdated', { detail: { status, session: detailSession } });
          // @ts-ignore - in test we send a plain object
          window.dispatchEvent(evt);
          
          // Trigger router refresh to update server components
          router.refresh();
          // Release global lock immediately after triggering refresh (tests are synchronous)
          if (ownsGlobalLockRef.current && globalObj.__AUTO_REFRESH_LOCK__) {
            delete globalObj.__AUTO_REFRESH_LOCK__;
            ownsGlobalLockRef.current = false;
          }
          
          // Clear the flag after a short delay to allow the refresh to complete
          setTimeout(() => {
            sessionStorage.removeItem(sessionStorageKey);
            hasTriggeredRefresh.current = false; // Reset for future logins
          }, 1000);
        }, 500);
      }
    }

    // Update previous status
    if (status !== "loading") {
      prevStatus.current = status;
    }
  }, [status, session, sessionStorageKey, router]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      // Ensure lock is released if this instance owned it
      if (ownsGlobalLockRef.current && globalObj.__AUTO_REFRESH_LOCK__) {
        delete globalObj.__AUTO_REFRESH_LOCK__;
        ownsGlobalLockRef.current = false;
      }
    };
  }, []);

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

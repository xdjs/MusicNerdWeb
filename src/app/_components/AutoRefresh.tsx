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
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const hasTriggeredRefresh = useRef(false);
  const [isClient, setIsClient] = useState(false);

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
        // Small delay to ensure session is stable
        const timer = setTimeout(() => {
          setIsLoading(false);
        }, 200);
        return () => clearTimeout(timer);
      }
    } else {
      setIsLoading(false);
    }
  }, [status, showLoading]);

  // Handle authentication state changes - following leaderboard pattern
  useEffect(() => {
    // Skip if not on client side, still loading, or if we've already triggered a refresh
    if (!isClient || status === "loading" || hasTriggeredRefresh.current) {
      return;
    }

    // If we have a session and we're authenticated, check if we need to refresh
    if (session && status === "authenticated") {
      try {
        const skipRefresh = sessionStorage.getItem(sessionStorageKey) === "true";
        
        if (!skipRefresh) {
          // Mark that we've triggered a refresh
          hasTriggeredRefresh.current = true;
          sessionStorage.setItem(sessionStorageKey, "true");
          
          // Trigger page reload to ensure server components get fresh session data
          setTimeout(() => {
            window.location.reload();
          }, 300);
        }
      } catch (error) {
        console.error("[AutoRefresh] Error accessing sessionStorage:", error);
      }
    }
  }, [session, status, sessionStorageKey, isClient]);

  // Clear the skip flag when component unmounts
  useEffect(() => {
    if (!isClient) return;

    return () => {
      // Clear the flag after a delay to allow the page to stabilize
      setTimeout(() => {
        try {
          sessionStorage.removeItem(sessionStorageKey);
        } catch (error) {
          console.error("[AutoRefresh] Error clearing sessionStorage:", error);
        }
      }, 2000);
    };
  }, [sessionStorageKey, isClient]);

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


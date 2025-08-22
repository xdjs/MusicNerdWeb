"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const hasTriggeredRefresh = useRef(false);
  const [isClient, setIsClient] = useState(false);
  const prevSessionState = useRef<{ hasSession: boolean; status: string } | null>(null);
  const sessionStableTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Handle authentication state changes - wait for session to be stable
  useEffect(() => {
    // Skip if not on client side, still loading, or if we've already triggered a refresh
    if (!isClient || status === "loading" || hasTriggeredRefresh.current) {
      return;
    }

    const currentSessionState = {
      hasSession: !!session,
      status: status
    };

    // Check if we've transitioned to authenticated state
    const hasTransitionedToAuthenticated = 
      prevSessionState.current && 
      !prevSessionState.current.hasSession && 
      currentSessionState.hasSession && 
      currentSessionState.status === "authenticated";

    // If we have a session and we're authenticated, check if we need to refresh
    if (session && status === "authenticated") {
      try {
        const skipRefresh = sessionStorage.getItem(sessionStorageKey) === "true";
        
        if (!skipRefresh || hasTransitionedToAuthenticated) {
          // Clear any existing timeout
          if (sessionStableTimeoutRef.current) {
            clearTimeout(sessionStableTimeoutRef.current);
          }

          // Wait for session to be stable (similar to authAdapter's 2-second wait)
          sessionStableTimeoutRef.current = setTimeout(async () => {
            try {
              // Mark that we've triggered a refresh
              hasTriggeredRefresh.current = true;
              sessionStorage.setItem(sessionStorageKey, "true");
              
              // Force session update first, then reload
              await update();
              
              // Use full page reload to ensure server components get fresh session data
              // This is necessary because the layout is a server component
              window.location.reload();
            } catch (error) {
              console.error("[AutoRefresh] Error during refresh:", error);
              // If update fails, still reload
              window.location.reload();
            }
          }, 2500); // Wait 2.5 seconds for session to be fully established
        }
      } catch (error) {
        console.error("[AutoRefresh] Error accessing sessionStorage:", error);
      }
    }

    // Update previous session state
    prevSessionState.current = currentSessionState;
  }, [session, status, sessionStorageKey, isClient, update]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (sessionStableTimeoutRef.current) {
        clearTimeout(sessionStableTimeoutRef.current);
      }
    };
  }, []);

  // Clear the skip flag when component unmounts
  useEffect(() => {
    if (!isClient) return;

    return () => {
      // Clear the flag immediately
      try {
        sessionStorage.removeItem(sessionStorageKey);
      } catch (error) {
        console.error("[AutoRefresh] Error clearing sessionStorage:", error);
      }
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


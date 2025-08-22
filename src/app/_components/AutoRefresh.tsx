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
  console.log("[AutoRefresh] Component mounted with props:", { sessionStorageKey, showLoading });
  
  const { data: session, status, update } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const hasTriggeredRefresh = useRef(false);
  const [isClient, setIsClient] = useState(false);
  const prevStatus = useRef<string | null>(null);
  const prevSessionId = useRef<string | null>(null);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Debug effect to see if component is re-rendering
  useEffect(() => {
    console.log("[AutoRefresh] Component re-rendered with:", {
      status,
      sessionExists: !!session,
      sessionId: session?.user?.id,
      isClient
    });
  });

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

  // Single effect to handle authentication state changes
  useEffect(() => {
    console.log("[AutoRefresh] Effect triggered - checking conditions:", {
      isClient,
      hasTriggeredRefresh: hasTriggeredRefresh.current,
      session: !!session,
      status,
      sessionId: session?.user?.id
    });

    // Skip if not on client side or if we've already triggered a refresh
    if (!isClient || hasTriggeredRefresh.current) {
      console.log("[AutoRefresh] Skipping - not client or already triggered refresh");
      return;
    }

    const currentSessionId = session?.user?.id;
    
    console.log("[AutoRefresh] Session state changed:", { 
      prevStatus: prevStatus.current, 
      currentStatus: status, 
      prevSessionId: prevSessionId.current,
      currentSessionId,
      hasSession: !!session,
      sessionUser: session?.user,
      hasTriggeredRefresh: hasTriggeredRefresh.current
    });

    // Check if we've transitioned to authenticated state
    const hasTransitionedToAuthenticated = 
      prevStatus.current &&
      prevStatus.current !== "authenticated" && 
      status === "authenticated" && 
      currentSessionId;

    // Check if session ID changed (user logged in)
    const sessionIdChanged = 
      prevSessionId.current !== currentSessionId && 
      currentSessionId;

    // If we have a session and we're authenticated, trigger refresh
    if (session && status === "authenticated" && currentSessionId) {
      console.log("[AutoRefresh] Session is authenticated, checking refresh conditions...");
      try {
        const skipRefresh = sessionStorage.getItem(sessionStorageKey) === "true";
        console.log("[AutoRefresh] Refresh conditions:", {
          skipRefresh,
          hasTransitionedToAuthenticated,
          sessionIdChanged,
          shouldRefresh: !skipRefresh || hasTransitionedToAuthenticated || sessionIdChanged
        });

        if (!skipRefresh || hasTransitionedToAuthenticated || sessionIdChanged) {
          console.log("[AutoRefresh] Triggering refresh - authenticated with session:", currentSessionId);

          // Mark that we've triggered a refresh immediately
          hasTriggeredRefresh.current = true;
          sessionStorage.setItem(sessionStorageKey, "true");

          // Add a small delay to avoid interfering with authentication flow
          console.log("[AutoRefresh] Reloading page in 1 second...");
          setTimeout(() => {
            console.log("[AutoRefresh] Reloading page...");
            window.location.reload();
          }, 1000);
        } else {
          console.log("[AutoRefresh] Skipping refresh - conditions not met");
        }
      } catch (error) {
        console.error("[AutoRefresh] Error accessing sessionStorage:", error);
      }
    } else {
      console.log("[AutoRefresh] Session not ready for refresh:", {
        hasSession: !!session,
        status,
        currentSessionId
      });
    }

    // Update previous values
    prevStatus.current = status;
    prevSessionId.current = currentSessionId || null;
  }, [session, status, sessionStorageKey, isClient]);

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


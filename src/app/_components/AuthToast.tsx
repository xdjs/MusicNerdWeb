"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";

// Helper to check if the user has newly approved UGC
// Now uses database-driven approach instead of localStorage
async function hasNewApprovedUGC(): Promise<boolean> {
  try {
    const resp = await fetch("/api/approvedUGCCount");
    if (!resp.ok) return false;
    const data = await resp.json();

    // The API now returns only newly approved count (database-driven)
    return data.count > 0;
  } catch {
    return false;
  }
}

// Helper to mark approved UGC as seen using database
async function markApprovedUGCAsSeen(): Promise<void> {
  try {
    await fetch("/api/markApprovedUGCSeen", {
      method: "POST",
    });
  } catch (e) {
    console.error("Failed to mark approved UGC as seen:", e);
  }
}

export default function AuthToast() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  
  // Keep track of the previous auth status so we only fire toasts
  // when the status actually changes.
  const prevStatusRef = useRef<typeof status>(status);
  const isFirstRunRef = useRef(true);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;

    // Skip the very first run to avoid showing a welcome toast on page reload
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      prevStatusRef.current = status;
      return;
    }

    // Show a welcome toast only when transitioning into "authenticated" from any
    // other state (after the initial mount), with a valid user object.
    if (prevStatus !== "authenticated" && status === "authenticated" && session?.user) {
      (async () => {
        // Check if user has newly approved UGC using database-driven approach
        try {
          const hasNew = await hasNewApprovedUGC();

          toast({
            title: "Welcome!",
            description: hasNew
              ? <span className="text-green-600">Your recently added artist data has been approved.</span>
              : (session.user.name ? "Welcome back!" : "You are now signed in"),
            duration: 3000,
          });

          if (hasNew) {
            // Mark the approved UGC as seen in the database
            await markApprovedUGCAsSeen();
            
            // Let other tabs know approvals were seen
            window.dispatchEvent(new Event('approvedUGCUpdated'));
          }
        } catch (e) {
          // Fail silently, fallback to default message
          toast({
            title: "Welcome!",
            description: session.user.name ? "Welcome back!" : "You are now signed in",
            duration: 3000,
          });
        }
      })();
    }

    // Show a sign-out toast only when transitioning from "authenticated" to
    // "unauthenticated".
    if (prevStatus === "authenticated" && status === "unauthenticated") {
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
        duration: 3000,
      });
    }

    prevStatusRef.current = status;
  }, [status, session, toast]);

  return null;
} 
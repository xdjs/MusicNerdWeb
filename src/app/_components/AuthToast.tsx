"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";

// Helper to check if the user has newly approved UGC
async function hasNewApprovedUGC(userId: string): Promise<boolean> {
  try {
    const resp = await fetch("/api/approvedUGCCount");
    if (!resp.ok) return false;
    const data = await resp.json();

    const storageKey = `approvedUGCCount_${userId}`;
    if (typeof window !== 'undefined') {
      const storedCount = Number(localStorage.getItem(storageKey) || "0");
      return data.count > storedCount;
    }
    return false;
  } catch {
    return false;
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
        const storageKey = `approvedUGCCount_${session.user.id}`;
        // Check if approvedUGC count increased
        try {
          const resp = await fetch("/api/approvedUGCCount");
          if (resp.ok) {
            const data = await resp.json();
            const stored = typeof window !== 'undefined' ? Number(localStorage.getItem(storageKey) || "0") : 0;
            const hasNew = data.count > stored;

            toast({
              title: "Welcome!",
              description: "Welcome back!",
              duration: 3000,
            });

            // Persist the new count so we don't repeat the message until more approvals happen
            if (typeof window !== 'undefined') {
              localStorage.setItem(storageKey, String(data.count));
            }
            if (hasNew) {
              // Let other tabs know approvals were seen
              window.dispatchEvent(new Event('approvedUGCUpdated'));
            }
          }
        } catch (e) {
          // Fail silently, fallback to default message
          toast({
            title: "Welcome!",
            description: "Welcome back!",
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
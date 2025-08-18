"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";

/**
 * Auto-refresh component that triggers a page reload when the user signs in
 * to ensure server components pick up the new session data immediately.
 * Uses sessionStorage to prevent multiple refreshes.
 */
export default function AutoRefresh() {
  const { status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const prevStatus = useRef<typeof status | null>(null);

  useEffect(() => {
    // Show loading for a brief moment to ensure session is stable
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    const skip = sessionStorage.getItem("autoRefreshSkipReload") === "true";

    if (!skip && prevStatus.current && prevStatus.current !== status && status !== "loading") {
      sessionStorage.setItem("autoRefreshSkipReload", "true");
      // Full reload so server components pick up the new session instantly
      window.location.reload();
    }

    if (skip && status !== "loading") {
      // Clear flag once the page has stabilized
      sessionStorage.removeItem("autoRefreshSkipReload");
    }

    if (status !== "loading") {
      prevStatus.current = status;
    }
  }, [status]);

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

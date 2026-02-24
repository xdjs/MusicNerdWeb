"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

/**
 * Refreshes server component data when the user signs in.
 * Uses router.refresh() to re-fetch server components without a full page
 * reload, preserving client-side state (modals, forms, React context).
 *
 * @param showLoading - Whether to show a loading overlay while the initial session is being determined (defaults to true)
 */
export default function AutoRefresh({
  showLoading = true
}: {
  showLoading?: boolean;
} = {}) {
  const { status } = useSession();
  const router = useRouter();
  const hasRefreshed = useRef(false);
  const prevStatus = useRef<string | null>(null);

  useEffect(() => {
    if (hasRefreshed.current) return;

    // Only refresh on a genuine unauthenticated→authenticated transition
    if (
      prevStatus.current === "unauthenticated" &&
      status === "authenticated"
    ) {
      hasRefreshed.current = true;
      router.refresh();
    }

    // Skip "loading" so post-mount loading→authenticated isn't mistaken for login
    if (status !== "loading") {
      prevStatus.current = status;
    }
  }, [status, router]);

  if (showLoading && status === "loading") {
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

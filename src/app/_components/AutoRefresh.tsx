"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

/**
 * Simple loading component that shows while session is being determined
 */
export default function AutoRefresh() {
  const { status } = useSession();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Show loading for a brief moment to ensure session is stable
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
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

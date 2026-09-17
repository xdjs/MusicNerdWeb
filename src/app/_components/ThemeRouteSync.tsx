"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Kept behind a small Suspense boundary so search params do not suspend the app. */
export default function ThemeRouteSync({ onRouteChange }: { onRouteChange: (concept: boolean) => void }) {
  const pathname = usePathname();
  const preview = useSearchParams().get("preview");
  const concept = pathname === "/profile" && preview === "concept";
  useEffect(() => {
    onRouteChange(concept);
  }, [concept, onRouteChange]);
  return null;
}

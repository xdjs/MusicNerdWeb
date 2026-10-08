"use client";

import { useState, type ReactNode } from "react";

/** Holds the real onboarding tree unmounted until the preview user starts it. */
export default function GuidedBuildStart({ artistName, children }: { artistName: string; children: ReactNode }) {
  const [started, setStarted] = useState(false);
  if (started) return <>{children}</>;
  return <section aria-label="Start real profile build" className="glass space-y-4 p-6">
    <h1 className="text-2xl font-bold">Build {artistName}’s profile</h1>
    <p className="text-sm text-muted-foreground">Start the actual research flow when you’re ready. It will find and verify profiles and sources, then build the artist’s page in this preview environment.</p>
    <button id="guided-build-start" type="button" onClick={() => setStarted(true)} className="min-h-12 rounded-xl bg-highlightpink px-5 py-3 font-semibold text-black">Start profile build</button>
    <p className="text-xs text-muted-foreground">This uses real services and saves real preview data. Reloading does not erase completed work.</p>
  </section>;
}

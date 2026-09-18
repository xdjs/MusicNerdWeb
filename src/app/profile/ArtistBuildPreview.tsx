"use client";

import BuildStatus from '@/app/artist/[id]/_components/onboarding/BuildStatus';

/** Static fixture of the real generation UI; starts no research or writes. */
export default function ArtistBuildPreview() {
  return <div className="min-h-[70vh] flex items-center justify-center px-5">
    <BuildStatus artistName="Pete Rango" complete={false} onSkip={() => window.history.back()} onFinish={() => {}} items={[
      { kind: 'progress', group: 'platform-search', text: 'Found 7 profiles', done: true },
      { kind: 'progress', group: 'source-search', done: false },
    ]} />
  </div>;
}

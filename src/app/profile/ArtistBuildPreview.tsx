"use client";

import ResearchView from '@/app/artist/[id]/_components/onboarding/ResearchView';

/** Static fixture of the real research view; starts no research or writes. */
export default function ArtistBuildPreview() {
  return <ResearchView artistName="Pete Rango" complete={false} onSkip={() => window.history.back()} onFinish={() => {}} onRetry={() => {}} items={[
    { kind: 'progress', group: 'platform-search', text: 'Found 7 profiles', done: true },
    { kind: 'progress', group: 'source-search', done: false },
  ]} />;
}

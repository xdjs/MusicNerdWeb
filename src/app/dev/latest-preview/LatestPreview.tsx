'use client';

import { useState } from 'react';
import LatestCards from '@/app/artist/[id]/_components/LatestCards';
import { useTheme } from '@/app/_components/ThemeProvider';
import type { ArtistLatestItem } from '@/lib/artist/artistLatest';

const release: ArtistLatestItem = {
    id: 'sample-release', kind: 'release', title: 'Sample release', text: 'album',
    date: '2026-01-02', imageUrl: '/default_pfp_pink.png', imageCaption: 'Music Nerd sample artwork',
    sourceUrl: null, sourceLabel: 'Sample release',
};
const states = [
    { id: 'cached', label: 'Cached release', description: 'After a first failed refresh, the saved release stays visible with the Spotify warning.' },
    { id: 'before', label: 'Before fix', description: 'Previously, that same failed refresh hid the saved release.' },
    { id: 'empty', label: 'No cached release', description: 'When no saved release is available, the warning remains. Opening this view does not retry Spotify.' },
] as const;

/** Fixed sample data around the production card component; no provider requests. */
export default function LatestPreview() {
    const [state, setState] = useState<(typeof states)[number]>(states[0]);
    const { theme, setTheme } = useTheme();
    return <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 pb-24 text-foreground">
        <header className="space-y-3">
            <h1 className="text-2xl font-semibold">Latest release preview</h1>
            <p className="text-sm text-muted-foreground">Sample data for reviewing a failed Spotify refresh.</p>
            <div className="flex flex-wrap gap-2" aria-label="Preview state">
                {states.map(value => <button key={value.id} type="button" aria-pressed={state.id === value.id}
                    onClick={() => setState(value)} className="min-h-11 rounded-lg border border-input px-3 text-sm aria-pressed:bg-pastypink/20">
                    {value.label}
                </button>)}
            </div>
            <p className="text-sm text-muted-foreground" aria-live="polite">{state.description}</p>
            <div className="flex gap-2" aria-label="Preview theme">
                {(['light', 'dark'] as const).map(value => <button key={value} type="button" aria-pressed={theme === value}
                    onClick={() => setTheme(value)} className="min-h-11 rounded-lg border border-input px-4 capitalize">
                    {value}
                </button>)}
            </div>
        </header>
        <LatestCards items={state.id === 'cached' ? [release] : []} artistName="Sample artist"
            artistImage="/default_pfp_pink.png" unavailable unavailableSources={['Spotify']}
            itemArtistNames={{ [release.id]: 'Sample artist' }} showFilters={false} />
    </div>;
}

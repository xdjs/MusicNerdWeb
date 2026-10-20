'use client';

import { useState } from 'react';
import { Globe, ExternalLink } from 'lucide-react';
import SortableArtistLinks from '@/app/_components/SortableArtistLinks';
import { EditModeContext } from '@/app/_components/EditModeContext';
import { getSourceLinks } from '@/lib/musicLinks/getSourceLinks';

const sources = [
    { id: 'website-one', url: 'https://theelliscourt.com', type: 'website', status: 'approved' },
    { id: 'website-two', url: 'https://theelliscourt.com:443/', type: 'website', status: 'approved' },
    { id: 'support', url: 'https://theelliscourt.bandcamp.com', type: 'profile', status: 'approved' },
    { id: 'editorial', url: 'https://example.com/artist-interview', type: 'interview', status: 'approved' },
    { id: 'pending', url: 'https://pending.example.com', type: 'website', status: 'pending' },
];

/** Read-only fixtures exercise the shipped grid without artist reads or mutation controls. */
export default function WebsiteLinksPreview() {
    const [isEditing, setEditing] = useState(false);
    return <div className="mx-auto w-full max-w-[832px] space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold">Website links · review #1583</h1>
        <p>Fixture comparison, not live artist data. The walkthrough showed two website pills; the exact historical URLs remain unconfirmed.</p>
        <button className="rounded-full border px-4 py-2" onClick={() => setEditing(!isEditing)}>{isEditing ? 'Show public view' : 'Show edit view'}</button>
        <section className="glass space-y-3 p-5" aria-label="Before">
            <h2 className="text-xl font-bold">Before · two website pills</h2>
            <div className="flex flex-wrap gap-2">{sources.slice(0, 2).map(source => <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm"><Globe aria-hidden="true" className="h-4 w-4" />theelliscourt.com<ExternalLink aria-hidden="true" className="h-3.5 w-3.5" /></a>)}</div>
        </section>
        <EditModeContext.Provider value={{canEdit:true,isEditing,toggle:()=>setEditing(!isEditing)}}>
            <section className="glass space-y-4 p-5" aria-label="After">
                <h2 className="text-xl font-bold">After · Links</h2>
                <SortableArtistLinks artistId="fixture-only" section="links" links={[]} supplementalLinks={getSourceLinks(sources)} canEdit />
                <h3 className="border-t pt-4 font-semibold">Support the artist</h3>
                <SortableArtistLinks artistId="fixture-only" section="support" links={[]} supplementalLinks={getSourceLinks(sources, [], 'support')} canEdit={false} />
                <p className="text-sm text-muted-foreground">Website review/removal stays in Lore. Pending websites stay private. Support is read-only in this fixture.</p>
            </section>
        </EditModeContext.Provider>
        <section className="glass space-y-2 p-5" aria-label="Lore fixture"><h2 className="text-xl font-bold">Lore · editorial source retained</h2><p>Artist interview — example.com/artist-interview</p></section>
        <p className="text-sm">This preview verifies icon rendering and URL serialization. Placement of the historical reported URLs, www/HTTP redirects and persisted duplicate provenance still need evidence.</p>
    </div>;
}

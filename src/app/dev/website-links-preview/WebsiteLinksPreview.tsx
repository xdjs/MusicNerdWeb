'use client';

import PressAndFeatures from '@/app/artist/[id]/_components/PressAndFeatures';
import { useState } from 'react';
import { Globe, ExternalLink } from 'lucide-react';
import SortableArtistLinks from '@/app/_components/SortableArtistLinks';
import { EditModeContext } from '@/app/_components/EditModeContext';
import { getSourceLinks } from '@/lib/musicLinks/getSourceLinks';

const sources = [
    { id: 'website-one', url: 'https://theelliscourt.com', type: 'website', status: 'approved' },
    { id: 'website-two', title: 'The Ellis Court biography', ogImage: '/demo/website-thumbnail-test.svg', url: 'https://theelliscourt.com/whats-the-ellis-court-2/', type: 'website', status: 'approved' },
    { id: 'equivalent-home', url: 'https://THEELLISCOURT.com:443/', type: 'website', status: 'approved' },
    { id: 'support', url: 'https://theelliscourt.bandcamp.com', type: 'profile', status: 'approved' },
    { id: 'editorial', url: 'https://example.com/artist-interview', type: 'interview', title: 'Artist interview', status: 'approved' },
    { id: 'missing-image', title: 'No image metadata · favicon fallback', url: 'https://theelliscourt.com/notes', type: 'website', status: 'approved' },
    { id: 'broken-image', title: 'Broken image · favicon fallback', url: 'https://theelliscourt.com/story', ogImage: '/dev/website-links-preview/intentionally-missing-image.png', type: 'website', status: 'approved' },
    { id: 'pending', url: 'https://pending.example.com', type: 'website', status: 'pending' },
];

/** Read-only fixtures exercise the shipped grid without artist reads or mutation controls. */
export default function WebsiteLinksPreview() {
    const [isEditing, setEditing] = useState(false);
    return <div className="mx-auto w-full max-w-[832px] space-y-6 px-4 py-8 text-black dark:text-white">
        <h1 className="text-2xl font-bold">Website links · review #1583</h1>
        <p>Fixture comparison, not live artist data. The saved walkthrough shows a homepage and a separate biography page, both classified as Website. The homepage belongs in Links; its biography page belongs in Lore.</p>
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
                <p className="text-sm text-muted-foreground">Only the main website appears in Links. Its biography page appears in Lore below. An equivalent homepage fixture is deduplicated. Website review/removal stays in Lore. Pending websites stay private. Support is read-only in this fixture.</p>
            </section>
        </EditModeContext.Provider>
        <section className="glass space-y-2 p-5" aria-label="Lore fixture"><h2 className="text-xl font-bold">Lore · supporting pages and editorial sources</h2><p className="text-sm text-muted-foreground">Thumbnail fixtures: the biography uses a neutral image labeled TEST IMAGE, not artist artwork or an image extracted from that site. The other website cards exercise missing metadata and a deliberately broken image. These use the real Lore renderer.</p><PressAndFeatures sources={sources.filter(source => source.status === 'approved')} /></section>
        <p className="text-sm">Routing uses the approved main website as an anchor, including homepages hosted under a path. Supporting pages retain their original URLs and provenance. This fixture uses the real Links and Lore renderers without changing artist data.</p>
    </div>;
}

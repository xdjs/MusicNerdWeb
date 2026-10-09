'use client';

import { ExternalLink, Globe, Music2 } from 'lucide-react';
import type { ArtistVaultSource } from '@/server/db/DbTypes';
import type { LinkSection, ProfileLink } from '@/lib/artist/artistProfileLinks';
import { getSourceLinks } from '@/lib/musicLinks/getSourceLinks';
import { isDestinationSource } from '@/lib/musicLinks/isDestinationSource';
import { parseMusicDestination } from '@/lib/musicLinks/parseMusicDestination';

/** Additional destinations retain their source's approvals, provenance and removal history. */
export default function OfficialSiteLinks({ artistId, sources, pendingSources = [], existingLinks = [], blockedSourceIds = [], section = 'links' }: {
    artistId: string;
    sources: ArtistVaultSource[];
    pendingSources?: ArtistVaultSource[];
    existingLinks?: ProfileLink[];
    blockedSourceIds?: string[];
    section?: LinkSection;
}) {
    const inSection = (source: ArtistVaultSource) => isDestinationSource(source) && (parseMusicDestination(source.url)?.support ?? false) === (section === 'support');
    const approved = sources.filter(source => source.status === 'approved' && inSection(source));
    const links = getSourceLinks(approved.filter(source => !blockedSourceIds.includes(source.id)), existingLinks, section).filter(link => link.kind === "website");
    if (!links.length) return null;
    return (
        <div className="flex flex-wrap items-center gap-2">
            {links.map(link => (
                <a key={link.sourceId} href={link.href} target="_blank" rel="noopener noreferrer"
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-black/15 bg-black/5 px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-highlightpink dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
                    {link.kind === 'website' ? <Globe className="h-4 w-4 shrink-0" aria-hidden="true" /> : <Music2 className="h-4 w-4 shrink-0" aria-hidden="true" />}
                    <span className="min-w-0 break-words">{link.label}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </a>
            ))}
        </div>
    );
}

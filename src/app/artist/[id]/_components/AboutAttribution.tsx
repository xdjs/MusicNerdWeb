import type { PublicArtistAbout } from '@/lib/bio/types';

/** Safe citation projection only; no private source review fields reach the client. */
export default function AboutAttribution({ about, portrait = false }: { about: PublicArtistAbout; portrait?: boolean }) {
    return <div className={`mt-1 text-xs ${portrait ? 'text-white/80' : 'text-muted-foreground'}`}>
        <span>{about.kind === 'official' ? 'From the artist’s bio' : 'Researched from public sources'}</span>
        <details className="inline-block ml-2 align-top">
            <summary className="cursor-pointer underline underline-offset-4">Sources</summary>
            <ul className="mt-2 space-y-1">
                {about.sources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{source.label}</a></li>)}
            </ul>
        </details>
    </div>;
}

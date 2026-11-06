import { notFound } from 'next/navigation';
import PreviousShareStudies from './PreviousShareStudies';
import { artistSharePreviewCases } from './artistSharePreviewCases';

export const metadata = { title: 'Artist share images | Music Nerd', robots: { index: false, follow: false } };
const artist = '/artist/73488cf7-3d3f-46ac-8cb1-74424c162ed6';
const previousDirections = [
    { key: 'cover', name: 'The cover', cta: 'read', invitation: 'Read their story', rationale: 'An oversized image and a name across the photograph. A white caption band gives the story its own clean space. The most immediate visual introduction.' },
    { key: 'sleeve', name: 'The sleeve', cta: 'explore', invitation: 'Explore LATASHÁ', rationale: 'A circular image and a diagonal title strip turn the card into a piece of music graphics. The boldest pink silhouette; exploration rather than a playback promise.' },
    { key: 'dossier', name: 'The dossier', cta: 'know', invitation: 'Get to know LATASHÁ', rationale: 'A photographic print and a pink biography slip overlap like an artist file. The personal introduction joins the image to the story. One source image, no invented archive material.' },
];

const recentDirections = [
    { key: 'spotlight', name: 'Spotlight', cta: 'know', invitation: 'Get to know LATASHÁ', rationale: 'A central arched portrait stands between the name and biography. A stage-like composition on pink, with the artist image as the focal point.' },
    { key: 'sequence', name: 'Sequence', cta: 'read', invitation: 'Read their story', rationale: 'One public photograph repeated as a three-frame sequence, including a closer crop. A wide name and caption make the reading order direct. These are crops of one image, not additional source photographs.' },
    { key: 'broadcast', name: 'Broadcast', cta: 'explore', invitation: 'Explore LATASHÁ', rationale: 'A pink-washed image, vertical name and angled white caption create a poster-like composition. The strongest departure in image treatment, with a less conventional reading direction.' },
];

const directions = [
    { key: 'manifesto', name: 'Manifesto', cta: 'know', invitation: 'Get to know LATASHÁ', rationale: 'The public biography becomes the headline. A small portrait and name sign the bottom, giving the story priority over the image.' },
    { key: 'orbit', name: 'Orbit', cta: 'know', invitation: 'Get to know LATASHÁ', rationale: 'Two floating circular forms pair a complete portrait with the biography. Horizontal typography keeps the reading order calm.' },
    { key: 'checkerboard', name: 'Checkerboard', cta: 'know', invitation: 'Get to know LATASHÁ', rationale: 'Four alternating blocks give the name, portrait, biography and invitation their own spaces. No overlaps or rotations.' },
    { key: 'panorama', name: 'Panorama', cta: 'know', invitation: 'Get to know LATASHÁ', rationale: 'An oversized name leads into one continuous photographic ribbon. The crop favors the upper portrait; the pink caption below carries the story.' },
    { key: 'monogram', name: 'Initial', cta: 'know', invitation: 'Get to know LATASHÁ', rationale: 'The first letter of the public name becomes a large typographic backdrop, with a circular portrait and a separate story panel. This is decorative type, not an artist logo.' },
    { key: 'margin', name: 'Wide margin', cta: 'know', invitation: 'Get to know LATASHÁ', rationale: 'An uncropped portrait sits inside a broad white surround. The name signs the lower margin while the biography runs down the pink edge.' },
];
const preservedDirections = [...previousDirections, ...recentDirections];

export default function ArtistSharePreviewPage() {
    if (process.env.NODE_ENV !== 'development' && process.env.VERCEL_ENV !== 'preview') notFound();
    return <main className="mx-auto max-w-[1600px] px-5 py-10 text-foreground space-y-12">
        <header className="max-w-3xl space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Nerd out on</h1>
            <p className="text-lg">The selected artist share image: a wider portrait, the artist’s name, and pink Music Nerd glasses.</p>
            <nav className="flex flex-wrap gap-5 underline"><a href="#selected">Selected design</a><a href="#fallbacks">Names and missing photos</a><a href="#directions">Earlier studies</a></nav>
        </header>
        <section id="selected" className="max-w-[1200px] space-y-4">
            <h2 className="text-2xl font-bold">LATASHÁ</h2>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href={`${artist}/share-image?v=3`} className="block focus-visible:outline focus-visible:outline-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${artist}/share-image?v=3`} alt="Nerd out on LATASHÁ — selected share image" width={1200} height={630} className="w-full h-auto" />
            </a>
            <div className="flex flex-wrap gap-5 underline">
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href={artist}>Open artist profile</a>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/artist/50f23458-df64-4381-8042-7333e8b64531/share-image?v=3">Pete Rango</a>
            </div>
        </section>
        <section id="fallbacks" className="space-y-5">
            <h2 className="text-2xl font-bold">Names and missing photos</h2>
            <p>The selected fallback keeps the full pink glasses beside the artist’s name.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
                {['missing', 'accent', 'long', 'wide', 'unicode'].map(scenario => <article key={scenario} className="space-y-3 min-w-0">
                    <h3 className="font-semibold">{scenario === 'missing' ? 'Selected missing-photo fallback' : artistSharePreviewCases.find(example => example.key === scenario)?.label}</h3>
                    <a href={`/dev/artist-share-preview/image?case=${scenario}`} className="block focus-visible:outline focus-visible:outline-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/dev/artist-share-preview/image?case=${scenario}`} alt={`Selected share image: ${scenario} example`} width={1200} height={630} className="w-full h-auto" />
                    </a>
                </article>)}
            </div>
        </section>
        <h2 className="text-3xl font-bold">Earlier studies</h2>
        <section id="directions" className="grid grid-cols-1 lg:grid-cols-3 gap-7">
            {directions.map(d => <article key={d.key} className="space-y-4 min-w-0">
                <h2 className="text-2xl font-bold">{d.name}</h2>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a className="block border border-gray-500/30 focus-visible:outline focus-visible:outline-2" href={`${artist}/share-image?v=1&layout=${d.key}&palette=logo&cta=${d.cta}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${artist}/share-image?v=1&layout=${d.key}&palette=logo&cta=${d.cta}`} alt={`${d.name}: LATASHÁ with public bio and ${d.invitation}`} width={1200} height={630} className="w-full h-auto" />
                </a>
                <p>{d.rationale}</p><p className="font-semibold">{d.invitation}</p>
                <div className="flex flex-wrap gap-4 text-sm underline">
                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                    <a href={`${artist}/share-image?v=1&layout=${d.key}&palette=pink&cta=${d.cta}`}>Site-token pink alternative</a>
                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                    <a href={`/artist/50f23458-df64-4381-8042-7333e8b64531/share-image?v=1&layout=${d.key}&palette=logo&cta=${d.cta}`}>Pete Rango</a>
                    <a href={`/dev/artist-share-preview/image?case=missing&layout=${d.key}&cta=${d.cta}`}>Missing content</a>
                </div>
            </article>)}
        </section>
        <details className="space-y-6 border-t border-gray-500/30 pt-6"><summary className="text-2xl font-bold cursor-pointer">The previous six / preserved</summary>
        <section id="first-directions" className="grid grid-cols-1 lg:grid-cols-3 gap-7">
            {preservedDirections.map(d => <article key={d.key} className="space-y-4 min-w-0">
                <h2 className="text-2xl font-bold">{d.name}</h2>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a className="block border border-gray-500/30 focus-visible:outline focus-visible:outline-2" href={`${artist}/share-image?v=1&layout=${d.key}&palette=logo&cta=${d.cta}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${artist}/share-image?v=1&layout=${d.key}&palette=logo&cta=${d.cta}`} alt={`${d.name}: LATASHÁ with public bio and ${d.invitation}`} width={1200} height={630} className="w-full h-auto" />
                </a>
                <p>{d.rationale}</p><p className="font-semibold">{d.invitation}</p>
                <div className="flex flex-wrap gap-4 text-sm underline">
                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                    <a href={`${artist}/share-image?v=1&layout=${d.key}&palette=pink&cta=${d.cta}`}>Site-token pink alternative</a>
                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                    <a href={`/artist/50f23458-df64-4381-8042-7333e8b64531/share-image?v=1&layout=${d.key}&palette=logo&cta=${d.cta}`}>Pete Rango</a>
                    <a href={`/dev/artist-share-preview/image?case=missing&layout=${d.key}&cta=${d.cta}`}>Missing content</a>
                </div>
            </article>)}
        </section>
        </details>
        <section className="max-w-3xl space-y-3">
            <h2 className="text-2xl font-bold">Earlier design recommendations</h2>
            <p>Manifesto offers the strongest new story-first direction; Checkerboard gives the clearest modular reading order. Orbit is a softer portrait-led alternative. Panorama depends on a suitable image crop, while Initial and Wide margin trade image scale for graphic identity. These are preserved proposals. The selected close-up above is now the default in this branch.</p>
            <p>“Get to know LATASHÁ” stays constant across this set so the composition is what changes. The earlier CTA studies remain below. The invitation describes the linked artist profile; it is not an independently clickable control.</p>
            <p className="text-sm opacity-70">The public artist image is artwork, not a newly generated portrait. All excerpts use the same text limit and preserve the original wording. Shown at social-card proportions; open a card for its native 1200 × 630 image. This is a proposal awaiting review.</p>
        </section>
        <section id="stress" className="space-y-5">
            <h2 className="text-2xl font-bold">Same long-name and bio stress case</h2>
            <p>Synthetic identity and biography, explicitly labeled here; no facts attributed to a real artist. Missing images use an abstract fallback.</p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">{directions.map(d => <div key={d.key} className="space-y-3"><h3 className="font-semibold">{d.name}</h3><a href={`/dev/artist-share-preview/image?case=stress&layout=${d.key}&palette=logo&cta=${d.cta}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/dev/artist-share-preview/image?case=stress&layout=${d.key}&palette=logo&cta=${d.cta}`} alt={`${d.name}: synthetic long-name and long-bio check`} width={1200} height={630} className="w-full h-auto border border-gray-500/30" />
            </a></div>)}</div>
        </section>
        <p className="text-sm opacity-70 max-w-3xl">Logo pink #FB57C0 comes from the navigation logo asset. Site-token pink #FF9CE3 remains a separate reference; the selected close-up uses logo pink. Only eligible public image/bio inputs. Missing bios are omitted; an ellipsis marks truncation. Image cache: one hour. Share apps may cache or crop differently.</p>
        <details id="previous" className="border-t border-gray-500/30 pt-6"><summary className="text-2xl font-bold cursor-pointer">Previous version / preserved for comparison</summary><PreviousShareStudies /></details>
    </main>;
}

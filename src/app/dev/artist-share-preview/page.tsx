import { notFound } from 'next/navigation';
import PreviousShareStudies from './PreviousShareStudies';

export const metadata = { title: 'Three art directions | Music Nerd', robots: { index: false, follow: false } };
const artist = '/artist/73488cf7-3d3f-46ac-8cb1-74424c162ed6';
const directions = [
    { key: 'cover', name: 'The cover', cta: 'read', invitation: 'Read their story', rationale: 'An oversized image and a name across the photograph. A white caption band gives the story its own clean space. The most immediate visual introduction.' },
    { key: 'sleeve', name: 'The sleeve', cta: 'explore', invitation: 'Explore LATASHÁ', rationale: 'A circular image and a diagonal title strip turn the card into a piece of music graphics. The boldest pink silhouette; exploration rather than a playback promise.' },
    { key: 'dossier', name: 'The dossier', cta: 'know', invitation: 'Get to know LATASHÁ', rationale: 'A photographic print and a pink biography slip overlap like an artist file. The personal introduction joins the image to the story. One source image, no invented archive material.' },
];

export default function ArtistSharePreviewPage() {
    if (process.env.NODE_ENV !== 'development' && process.env.VERCEL_ENV !== 'preview') notFound();
    return <main className="mx-auto max-w-[1600px] px-5 py-10 text-foreground space-y-12">
        <header className="max-w-3xl space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Three different ways in.</h1>
            <p className="text-lg">A cover, a sleeve, an artist dossier. Different shapes and image treatments, using the same LATASHÁ image and the same public biography excerpt.</p>
            <p className="opacity-70">The earlier designs repeated a split-card structure. These studies change the composition itself. Inter and the genuine corner glasses stay; no separate buttons, invented facts or playback promises.</p>
            <nav className="flex flex-wrap gap-5 underline"><a href="#directions">Compare directions</a><a href="#stress">Long-name check</a><a href="#previous">Previous version</a></nav>
        </header>
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
        <section className="max-w-3xl space-y-3">
            <h2 className="text-2xl font-bold">The design recommendation</h2>
            <p>The dossier is the strongest Music Nerd direction: it makes the artist’s story feel like something worth opening, without borrowing the look of a streaming app. The cover is the strongest image-first alternative. The sleeve is the most graphic, but its circular crop is less adaptable across photographs.</p>
            <p>“Get to know LATASHÁ” is a personal introduction. “Read their story” promises the public biography and falls back when it is missing. “Explore LATASHÁ” leaves the route open to the profile’s music links and context. These are three different invitations, not independent buttons.</p>
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
        <p className="text-sm opacity-70 max-w-3xl">Logo pink #FB57C0 comes from the navigation logo asset. Site-token pink #FF9CE3 remains a separate reference; neither is presented as an owner-approved choice. Only eligible public image/bio inputs. Missing bios are omitted; an ellipsis marks truncation. Image cache: one hour. Share apps may cache or crop differently.</p>
        <details id="previous" className="border-t border-gray-500/30 pt-6"><summary className="text-2xl font-bold cursor-pointer">Previous version / preserved for comparison</summary><PreviousShareStudies /></details>
    </main>;
}

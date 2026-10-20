import Link from 'next/link';
import { notFound } from 'next/navigation';

export const metadata = { title: 'Artist share design studies | Music Nerd', robots: { index: false, follow: false } };

const profile = '/artist/50f23458-df64-4381-8042-7333e8b64531';
const studies = [
    { key: 'editorial', title: '01 / Editorial', description: 'The story first. A generous text column and a separate square portrait.', palette: 'white', cta: 'know' },
    { key: 'portrait', title: '02 / Portrait led', description: 'More room for the artist image, with a clean, separate reading panel.', palette: 'white', cta: 'music' },
    { key: 'profile', title: '03 / Profile', description: 'A name-led composition with a compact portrait and a broad bio excerpt.', palette: 'logo', cta: 'meet' },
];
const invitations = [
    { key: 'know', text: 'Get to know Pete Rango', note: 'Recommended: the profile offers the person, their story and their links.' },
    { key: 'music', text: 'Explore their music', note: 'Music-led: invites exploration through profile links, without promising playback.' },
    { key: 'meet', text: 'Meet Pete Rango', note: 'Shortest: a direct introduction to the artist.' },
];

export default function ArtistSharePreviewPage() {
    if (process.env.NODE_ENV !== 'development' && process.env.VERCEL_ENV !== 'preview') notFound();
    return <main className="mx-auto max-w-3xl text-foreground px-5 py-10 space-y-12">
        <header className="space-y-4">
            <p className="text-sm uppercase tracking-widest opacity-60">Music Nerd / Design studies / 1579</p>
            <h1 className="text-4xl font-bold tracking-tight">Three ways to meet an artist.</h1>
            <p className="text-lg">Different compositions. A few quieter invitations. Same public artist image, public bio, Inter and genuine glasses.</p>
            <p className="text-sm opacity-70">Preview proposals only. No layout or CTA has owner approval. White and logo pink #FB57C0 are shown; the earlier candidate is preserved below. Click a card to inspect its image. In a shared link, the entire card opens the artist profile.</p>
            <nav className="flex gap-5 underline text-sm"><a href="#layouts">Layouts</a><a href="#invitations">CTA comparison</a><a href="#reference">Earlier candidate</a></nav>
        </header>
        <div id="layouts" className="space-y-12">
            {studies.map(study => <section key={study.key} className="space-y-3">
                <h2 className="text-2xl font-semibold">{study.title}</h2><p className="opacity-70">{study.description}</p>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href={`${profile}/share-image?v=1&layout=${study.key}&palette=${study.palette}&cta=${study.cta}`} className="block overflow-hidden rounded-xl border border-gray-500/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${profile}/share-image?v=1&layout=${study.key}&palette=${study.palette}&cta=${study.cta}`} alt={`${study.title}: Pete Rango, public bio and ${study.cta === 'know' ? 'Get to know Pete Rango' : study.cta === 'music' ? 'Explore their music' : 'Meet Pete Rango'}`} width="1200" height="630" className="w-full h-auto" />
                </a>
                <div className="flex flex-wrap gap-5 text-sm underline">
                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                    <a href={`${profile}/share-image?v=1&layout=${study.key}&palette=${study.palette === 'white' ? 'logo' : 'white'}&cta=${study.cta}`}>View {study.palette === 'white' ? 'logo pink' : 'white'} version</a>
                    <a href={`/dev/artist-share-preview/image?case=missing&layout=${study.key}`}>Missing image / bio</a>
                    <a href={`/dev/artist-share-preview/image?case=long&layout=${study.key}`}>Long-name example</a>
                </div>
            </section>)}
        </div>
        <section id="invitations" className="space-y-6 border-t border-gray-500/30 pt-8">
            <div className="space-y-2"><h2 className="text-2xl font-semibold">Same layout. Different invitation.</h2><p className="opacity-70">Compare the wording on the editorial card. All three can accompany any layout. Long names use “the artist” to keep the invitation readable. These are lines of image text, not separate buttons.</p></div>
            {invitations.map(invitation => <div key={invitation.key} className="space-y-3">
                <h3 className="text-lg font-semibold">{invitation.text}</h3><p className="text-sm opacity-70">{invitation.note}</p>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href={`${profile}/share-image?v=1&layout=editorial&palette=logo&cta=${invitation.key}`} className="block max-w-lg overflow-hidden rounded-xl border border-gray-500/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${profile}/share-image?v=1&layout=editorial&palette=logo&cta=${invitation.key}`} alt={`Editorial card: ${invitation.text}`} width="1200" height="630" className="w-full h-auto" />
                </a>
            </div>)}
        </section>
        <section id="reference" className="space-y-3 border-t border-gray-500/30 pt-8">
            <h2 className="text-2xl font-semibold">Earlier candidate / unchanged</h2><p className="opacity-70">Inter, “Explore the artist,” rounded portrait and bottom-right glasses. Kept here as the reference, with the same logo pink.</p>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href={`${profile}/share-image?v=1&palette=logo`} className="block overflow-hidden rounded-xl border border-gray-500/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${profile}/share-image?v=1&palette=logo`} alt="Earlier candidate, unchanged: Explore the artist" width="1200" height="630" className="w-full h-auto" />
            </a>
            <Link href={profile} className="inline-block underline">View Pete Rango’s public profile</Link>
        </section>
        <details className="space-y-3 border-t border-gray-500/30 pt-8">
            <summary className="cursor-pointer text-lg font-semibold">Photography check / Beta Radio</summary>
            <p className="opacity-70">The portrait-led layout with a public photographic artist image, using the same eligibility and public-bio gates.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/artist/2fc885c3-7be5-4710-b7b2-63e9dfc9945d/share-image?v=1&layout=portrait&palette=white&cta=know" alt="Beta Radio portrait-led proposal" width="1200" height="630" className="w-full h-auto" />
        </details>
        <p className="text-sm opacity-60">Only eligible public images and biography excerpts. Missing bios stay omitted. Longer excerpts end with an ellipsis. Share apps choose their own crop and can retain old cards; our image cache refreshes within an hour. No production changes.</p>
    </main>;
}

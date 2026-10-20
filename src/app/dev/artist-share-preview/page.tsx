import Link from 'next/link';
import { notFound } from 'next/navigation';
import { artistSharePreviewCases } from './artistSharePreviewCases';

export const metadata = { title: 'Artist share proposal | Music Nerd', robots: { index: false, follow: false } };

export default function ArtistSharePreviewPage() {
    if (process.env.NODE_ENV !== 'development' && process.env.VERCEL_ENV !== 'preview') notFound();
    return <main className="mx-auto max-w-3xl text-foreground px-5 py-10 space-y-8">
        <header className="space-y-3"><p className="text-sm text-pink-400">Design proposal · #1579</p><h1 className="text-3xl font-bold">A little more artist. In every share.</h1><p>Two new proposals: white or brand-pink, with the genuine glasses directly on the background. The pink is #FF9CE3, the website’s brandpink token. These use KoHo, the intended brand font declared in the site styles, with the glasses at bottom right. Public bio excerpts and portraits stay; no missing biography is invented. Owner approval is pending.</p></header>
        {(['white', 'pink'] as const).map(palette => <section key={palette} className="space-y-3">
            <h2 className="text-xl font-semibold">{palette === 'white' ? 'White' : 'Brand pink'} · KoHo · Pete Rango</h2>
            {/* Direct PNG download, not a Next page navigation. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href={`/artist/50f23458-df64-4381-8042-7333e8b64531/share-image?v=1&palette=${palette}`} className="block overflow-hidden rounded-2xl border border-gray-500/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/artist/50f23458-df64-4381-8042-7333e8b64531/share-image?v=1&palette=${palette}`} alt={`Pete Rango public card in KoHo on ${palette}, glasses without a box`} width="1200" height="630" className="w-full h-auto" />
                <div className="p-4"><p className="font-semibold">Pete Rango | Music Nerd</p></div>
            </a>
        </section>)}
        <Link className="underline" href="/artist/50f23458-df64-4381-8042-7333e8b64531">View the public profile</Link>
        <p>Fallback and typography fixtures below use the existing public demo logo, supported accented names and a fictional long name. No biography is invented for these examples. Unsupported names use neutral image text while the full name remains in the link title.</p>
        {artistSharePreviewCases.map(({ key, label, name }) => <section key={key} className="space-y-3">
            <h2 className="text-xl font-semibold">{label}</h2>
            <a href={`/dev/artist-share-preview/image?case=${key}`} className="block overflow-hidden rounded-2xl border border-gray-500/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/dev/artist-share-preview/image?case=${key}`} alt={label} width="1200" height="630" className="w-full h-auto" />
                <div className="p-4"><p className="font-semibold">{name.normalize('NFC')} | Music Nerd</p></div>
            </a>
        </section>)}
        <section className="space-y-3"><h2 className="text-xl font-semibold">Real staging profiles</h2>
            <p>Open these profile links to review their live share metadata and public content.</p>
            <div className="flex flex-wrap gap-4 underline"><Link href="/artist/53bac261-74f1-4c69-a826-f275728d7a1f">Radiohead</Link><Link href="/artist/6cb3d81a-3d02-4c57-a711-bb7902a9af1b">Dutchyyy</Link></div>
        </section>
        <p className="text-sm opacity-70">Illustrative link cards. Each app chooses its own crop and layout. Images refresh on our CDN within an hour; social apps can retain older cards. Open an image to inspect the full-size PNG.</p>
    </main>;
}

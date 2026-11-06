import { ImageResponse } from 'next/og';
import { getShareArtistName } from '@/lib/artistShare/getShareArtistName';
import { getShareBioExcerpt } from '@/lib/artistShare/getShareBioExcerpt';
import { getShareCallToAction } from '@/lib/artistShare/getShareCallToAction';
import { shareGlasses, shareImageFonts } from './shareImageAssets';

/** Additional preview-only compositions; all inputs already passed public eligibility. */
export function renderArtistAdditionalDirection(name: string, portrait: string | null, publicBio: string | null | undefined, layout: 'spotlight' | 'sequence' | 'broadcast', palette: 'white' | 'logo' | 'pink' = 'logo', cta: 'know' | 'music' | 'meet' | 'explore' | 'story' | 'read' = 'know') {
    const chars = Array.from(getShareArtistName(name));
    const displayName = chars.length > 80 ? `${chars.slice(0,79).join('')}…` : chars.join('');
    const long = chars.length > 24;
    const pink = palette === 'pink' ? '#ff9ce3' : '#fb57c0';
    const excerpt = getShareBioExcerpt(publicBio, 100);
    const invitation = getShareCallToAction(chars.length > 12 ? 'Discover this artist' : name, cta, Boolean(excerpt));
    const title = { display: '-webkit-box' as const, WebkitBoxOrient: 'vertical' as const, WebkitLineClamp: long ? 3 : 2, overflow: 'visible' as const, textOverflow: 'ellipsis' as const, wordBreak: 'break-word' as const, fontWeight: 700, lineHeight: 1.02, letterSpacing: '-2px', paddingBottom: 8, paddingRight: 12 };
    const bio = { display: '-webkit-box' as const, WebkitBoxOrient: 'vertical' as const, WebkitLineClamp: 4, overflow: 'visible' as const, textOverflow: 'ellipsis' as const, wordBreak: 'break-word' as const, fontSize: 36, lineHeight: 1.2, paddingRight: 14 };
    const photo = (width: number, height: number) => portrait
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={portrait} alt="" width={width} height={height} style={{ objectFit: 'cover' }} />
        : <div style={{ display: 'flex', width, height, background: pink, alignItems: 'center', justifyContent: 'center' }}><div style={{ width: Math.min(width,height)*.6, height: Math.min(width,height)*.6, border: '12px solid #171717', borderRadius: '50%' }} /></div>;
    return new ImageResponse(<div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: layout === 'sequence' ? '#ffffff' : pink, color: '#171717', fontFamily: 'Inter' }}>
        {layout === 'spotlight' && <>
            <div style={{ display: 'flex', position: 'absolute', left: 385, top: 32, width: 430, height: 562, borderRadius: '220px 220px 0 0', background: '#ffffff', padding: 18 }}>
                <div style={{ display: 'flex', width: 394, height: 526, overflow: 'hidden', borderRadius: '200px 200px 0 0' }}>{photo(394,526)}</div>
            </div>
            <div style={{ ...title, position: 'absolute', left: 34, top: 70, width: 330, fontSize: long ? 38 : chars.length > 12 ? 48 : 58 }}>{displayName}</div>
            {excerpt && <div style={{ ...bio, position: 'absolute', left: 846, top: 115, width: 326, fontSize: 32, WebkitLineClamp: 8 }}>{excerpt}</div>}
            <div style={{ display: 'flex', position: 'absolute', left: 34, bottom: 56, width: 310, wordBreak: 'break-word', fontSize: 30, fontWeight: 700, lineHeight: 1.2 }}>{invitation}</div>
        </>}
        {layout === 'sequence' && <>
            <div style={{ ...title, position: 'absolute', left: 42, top: 22, width: 1110, fontSize: long ? 42 : chars.length > 10 ? 56 : 94, WebkitLineClamp: 2 }}>{displayName}</div>
            <div style={{ display: 'flex', position: 'absolute', left: 0, top: 150, width: 1200, height: 280, background: pink, padding: '14px 32px', gap: 16 }}>
                {[0,1,2].map(index => <div key={index} style={{ display: 'flex', position: 'relative', width: 368, height: 252, overflow: 'hidden', background: '#171717' }}>{index === 1 && portrait ? <img src={portrait} alt="" width={600} height={667} style={{ position: 'absolute', left: -116, top: -130, objectFit: 'cover' }} /> : photo(368,252)}</div>)}
            </div>
            {excerpt && <div style={{ ...bio, position: 'absolute', left: 42, top: 452, width: 1080, WebkitLineClamp: 2 }}>{excerpt}</div>}
            <div style={{ display: 'flex', position: 'absolute', left: 42, bottom: 26, fontSize: 30, fontWeight: 700 }}>{invitation}</div>
        </>}
        {layout === 'broadcast' && <>
            <div style={{ display: 'flex', position: 'absolute', left: 0, top: 0, width: 1200, height: 630, opacity: .55, overflow: 'hidden' }}>{portrait
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={portrait} alt="" width={1200} height={1335} style={{ position: 'absolute', top: -270, objectFit: 'cover' }} /> : photo(1200,630)}</div>
            <div style={{ display: 'flex', position: 'absolute', left: 0, top: 0, width: 190, height: 630, background: pink }} />
            <div style={{ ...title, position: 'absolute', left: -205, top: 235, width: 580, height: 160, fontSize: long ? 32 : chars.length > 10 ? 46 : 90, transform: 'rotate(-90deg)', WebkitLineClamp: 3 }}>{displayName}</div>
            <div style={{ display: 'flex', position: 'absolute', left: 525, top: 320, width: 760, height: 400, background: '#ffffff', transform: 'rotate(-12deg)' }} />
            {excerpt && <div style={{ ...bio, position: 'absolute', left: 585, top: 398, width: 560, fontSize: 34, WebkitLineClamp: 3 }}>{excerpt}</div>}
            <div style={{ display: 'flex', position: 'absolute', left: 585, top: 548, width: 430, wordBreak: 'break-word', fontSize: 28, fontWeight: 700 }}>{invitation}</div>
        </>}
        <div style={{ display: 'flex', position: 'absolute', right: 30, bottom: 22 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shareGlasses} alt="Music Nerd glasses" width={78} height={55} />
        </div>
    </div>, { width: 1200, height: 630, fonts: shareImageFonts, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } });
}

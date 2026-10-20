import { ImageResponse } from 'next/og';
import { getShareArtistName } from '@/lib/artistShare/getShareArtistName';
import { getShareBioExcerpt } from '@/lib/artistShare/getShareBioExcerpt';
import { getShareCallToAction } from '@/lib/artistShare/getShareCallToAction';
import { shareGlasses, shareImageFonts } from './shareImageAssets';

/** Distinct preview art directions, using only the existing eligible public inputs. */
export function renderArtistArtDirection(name: string, portrait: string | null, publicBio: string | null | undefined, layout: 'cover' | 'sleeve' | 'dossier', palette: 'white' | 'logo' | 'pink' = 'logo', cta: 'know' | 'music' | 'meet' | 'explore' | 'story' | 'read' = 'know') {
    const chars = Array.from(getShareArtistName(name));
    const displayName = chars.length > 80 ? `${chars.slice(0, 79).join('')}…` : chars.join('');
    const long = chars.length > 24;
    const pink = palette === 'pink' ? '#ff9ce3' : '#fb57c0';
    const excerpt = getShareBioExcerpt(publicBio, 100);
    const invitation = getShareCallToAction(name, cta, Boolean(excerpt));
    const titleStyle = { display: '-webkit-box' as const, WebkitBoxOrient: 'vertical' as const, WebkitLineClamp: long ? 2 : 1, textOverflow: 'ellipsis' as const, overflow: 'visible' as const, wordBreak: 'break-word' as const, fontWeight: 700, lineHeight: 1.02, letterSpacing: '-3px', paddingRight: 20, paddingBottom: 8, fontSize: long ? 48 : chars.length > 14 ? 76 : 116 };
    const bioStyle = { display: '-webkit-box' as const, WebkitBoxOrient: 'vertical' as const, WebkitLineClamp: 3, textOverflow: 'ellipsis' as const, overflow: 'visible' as const, wordBreak: 'break-word' as const, fontSize: 36, lineHeight: 1.22, paddingRight: 18 };
    const image = (width: number, height: number, position = 'center') => portrait
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={portrait} alt="" width={width} height={height} style={{ objectFit: 'cover', objectPosition: position }} />
        : <div style={{ display: 'flex', width, height, background: pink, alignItems: 'center', justifyContent: 'center' }}><div style={{ width: Math.min(width,height)*.65, height: Math.min(width,height)*.65, border: '18px solid #171717', borderRadius: '50%' }} /></div>;
    return new ImageResponse(
        <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: layout === 'sleeve' ? pink : '#ffffff', color: '#171717', fontFamily: 'Inter' }}>
            {layout === 'cover' && <>
                <div style={{ display: 'flex', position: 'absolute', inset: '0 0 auto 0', width: 1200, height: 390, overflow: 'hidden' }}>{portrait ? <img src={portrait} alt="" width={1200} height={1335} style={{ position: 'absolute', top: -270, objectFit: 'cover' }} /> : image(1200,390)}</div>
                <div style={{ display: 'flex', position: 'absolute', left: 0, top: 0, width: 1200, height: 390, background: 'linear-gradient(180deg, transparent 20%, rgba(0,0,0,.72) 100%)' }} />
                <div style={{ ...titleStyle, position: 'absolute', left: 42, bottom: 260, width: 1110, color: '#ffffff' }}>{displayName}</div>
                <div style={{ display: 'flex', position: 'absolute', left: 0, top: 390, width: 1200, height: 12, background: pink }} />
                <div style={{ ...bioStyle, position: 'absolute', left: 44, top: 424, width: 1080, WebkitLineClamp: 2 }}>{excerpt}</div>
                <div style={{ display: 'flex', position: 'absolute', left: 44, bottom: 32, fontSize: 32, fontWeight: 700 }}>{invitation}</div>
            </>}
            {layout === 'sleeve' && <>
                <div style={{ display: 'flex', position: 'absolute', left: 660, top: -110, width: 520, height: 520, borderRadius: '50%', background: '#171717', padding: 24, overflow: 'hidden', transform: 'rotate(-12deg)' }}>
                    <div style={{ display: 'flex', width: 472, height: 472, borderRadius: '50%', overflow: 'hidden' }}>{image(472,472)}</div>
                </div>
                <div style={{ display: 'flex', position: 'absolute', left: 42, top: 42, width: 104, height: 104, borderRadius: '50%', border: '3px solid #171717' }}><div style={{ position: 'absolute', left: 45, top: 45, width: 8, height: 8, borderRadius: '50%', background: '#171717' }} /></div>
                <div style={{ display: 'flex', position: 'absolute', left: 0, top: 235, width: 1138, minHeight: 142, background: '#ffffff', padding: '12px 42px', transform: 'rotate(-3deg)' }}><div style={{ ...titleStyle, width: 1050 }}>{displayName}</div></div>
                <div style={{ ...bioStyle, position: 'absolute', left: 44, top: 420, width: 1000, WebkitLineClamp: 2 }}>{excerpt}</div>
                <div style={{ display: 'flex', position: 'absolute', left: 44, bottom: 32, fontSize: 32, fontWeight: 700 }}>{invitation}</div>
            </>}
            {layout === 'dossier' && <>
                <div style={{ display: 'flex', position: 'absolute', left: long ? 790 : 650, top: long ? 174 : 72, width: long ? 350 : 460, height: long ? 350 : 460, background: '#ffffff', padding: 16, border: '1px solid #171717', transform: 'rotate(8deg)' }}>{image(long ? 316 : 426,long ? 316 : 426)}</div>
                <div style={{ ...titleStyle, position: 'absolute', left: 44, top: 32, width: 1090, fontSize: long ? 48 : chars.length > 14 ? 72 : 108 }}>{displayName}</div>
                <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', left: 28, top: 254, width: 760, minHeight: 242, background: pink, padding: '30px 34px', transform: 'rotate(-4deg)' }}>
                    {excerpt && <div style={{ ...bioStyle, width: 690 }}>{excerpt}</div>}
                    <div style={{ display: 'flex', marginTop: excerpt ? 20 : 0, fontSize: 30, fontWeight: 700, width: 690 }}>{invitation}</div>
                </div>
            </>}
            <div style={{ display: 'flex', position: 'absolute', right: 38, bottom: 24 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shareGlasses} alt="Music Nerd glasses" width={78} height={55} />
            </div>
        </div>,
        { width: 1200, height: 630, fonts: shareImageFonts, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } },
    );
}

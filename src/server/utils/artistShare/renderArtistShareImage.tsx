import { sharePinkGlasses, shareImageFonts } from './shareImageAssets';
import { ImageResponse } from 'next/og';
import { getShareArtistName } from '@/lib/artistShare/getShareArtistName';

/** Selected close-up and full-glasses fallback, using only public identity/portrait. */
export function renderArtistShareImage(name: string, portrait: string | null) {
    const supportedName = getShareArtistName(name);
    const chars = Array.from(supportedName === 'Discover this artist' ? 'this artist' : supportedName);
    const displayName = chars.length > 90 ? `${chars.slice(0, 89).join('')}…` : chars.join('');
    const fontSize = portrait
        ? chars.length <= 9 ? 135 : chars.length <= 16 ? 105 : chars.length <= 30 ? 80 : 58
        : chars.length <= 10 ? 113 : chars.length <= 16 ? 94 : chars.length <= 30 ? 70 : 45;
    return new ImageResponse(
        <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#000000', color: '#ffffff', fontFamily: 'Inter', fontWeight: 700 }}>
            {portrait &&
                // ImageResponse consumes already-normalized inline PNGs.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={portrait} alt="" width={1472} height={1472} style={{ position: 'absolute', left: 187, top: -294, objectFit: 'cover' }} />}
            {portrait && <div style={{ position: 'absolute', left: 0, top: 0, width: 1200, height: 630, background: 'linear-gradient(90deg, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.94) 49%, rgba(0,0,0,0.25) 82%, rgba(0,0,0,0) 100%)' }} />}
            <div style={{ display: 'flex', position: 'absolute', left: 53, top: portrait ? 181 : 167, fontSize: portrait ? 81 : 79, lineHeight: 1.2, letterSpacing: '-0.045em', color: '#fb57c0' }}>Nerd out on</div>
            <div style={{ display: '-webkit-box', position: 'absolute', left: portrait ? 47 : 48, top: portrait ? (fontSize === 135 ? 285 : 296) : (chars.length > 18 ? 314 : 291), width: portrait ? 826 : 600, fontSize, lineHeight: 1.12, letterSpacing: '-0.045em', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, textOverflow: 'ellipsis', overflow: 'hidden', wordBreak: 'break-word' }}>{displayName}</div>
            {/* Exact repository glasses, recolored to logo pink, without a badge. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sharePinkGlasses} alt="Music Nerd glasses" width={portrait ? 100 : 484} height={portrait ? 71 : 484 * 1370 / 1929} style={{ position: 'absolute', ...(portrait ? { right: 48, bottom: 48 } : { left: 668, top: 137 }) }} />
        </div>,
        { width: 1200, height: 630, fonts: shareImageFonts, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } },
    );
}

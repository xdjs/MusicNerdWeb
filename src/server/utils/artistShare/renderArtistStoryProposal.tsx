import { ImageResponse } from 'next/og';
import { getShareArtistName } from '@/lib/artistShare/getShareArtistName';
import { getShareBioExcerpt } from '@/lib/artistShare/getShareBioExcerpt';
import { getShareCallToAction } from '@/lib/artistShare/getShareCallToAction';
import { shareGlasses, shareImageFonts } from './shareImageAssets';

/** A preview-only editorial refinement; receives only eligible public display content. */
export function renderArtistStoryProposal(name: string, portrait: string | null, publicBio?: string | null, palette: 'white' | 'logo' = 'logo', cta: 'know' | 'music' | 'meet' | 'explore' | 'story' = 'know') {
    const chars = Array.from(getShareArtistName(name));
    const displayName = chars.length > 90 ? `${chars.slice(0, 89).join('')}…` : chars.join('');
    const long = chars.length > 24;
    const excerpt = getShareBioExcerpt(publicBio, long ? 70 : 90);
    const background = palette === 'logo' ? '#fb57c0' : '#ffffff';
    return new ImageResponse(
        <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', background, color: '#171717', fontFamily: 'Inter' }}>
            <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', left: 56, top: 56, width: 640 }}>
                <div style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: long ? 3 : 2, textOverflow: 'ellipsis', overflow: 'visible', paddingRight: 24, fontSize: chars.length > 40 ? 42 : chars.length > 18 ? 58 : 80, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-1.5px', wordBreak: 'break-word', paddingBottom: 6 }}>{displayName}</div>
                {excerpt && <div style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, textOverflow: 'ellipsis', overflow: 'visible', paddingRight: 24, marginTop: 24, fontSize: 40, lineHeight: 1.25, wordBreak: 'break-word' }}>{excerpt}</div>}
                <div style={{ display: 'flex', width: 616, marginTop: 32, fontSize: 36, fontWeight: 700, lineHeight: 1.2, wordBreak: 'break-word' }}>{getShareCallToAction(name, cta, Boolean(excerpt))}</div>
            </div>
            <div style={{ display: 'flex', position: 'absolute', left: 744, top: 56, width: 408, height: 408, overflow: 'hidden', background: '#f1f1f1', alignItems: 'center', justifyContent: 'center' }}>
                {portrait
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={portrait} alt="" width={408} height={408} style={{ objectFit: 'cover' }} />
                    : <div style={{ display: 'flex', width: 286, height: 286, borderRadius: '50%', background: '#171717', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 57, height: 57, borderRadius: '50%', background }} /></div>}
            </div>
            <div style={{ display: 'flex', position: 'absolute', right: 48, bottom: 40 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shareGlasses} alt="Music Nerd glasses" width={86} height={61} />
            </div>
        </div>,
        { width: 1200, height: 630, fonts: shareImageFonts, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } },
    );
}

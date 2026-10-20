import { renderArtistArtDirection } from './renderArtistArtDirection';
import { renderArtistStoryProposal } from './renderArtistStoryProposal';
import { ImageResponse } from 'next/og';
import { getShareArtistName } from '@/lib/artistShare/getShareArtistName';
import { getShareBioExcerpt } from '@/lib/artistShare/getShareBioExcerpt';
import { getShareCallToAction } from '@/lib/artistShare/getShareCallToAction';
import { shareGlasses, shareImageFonts } from './shareImageAssets';

/** Preview-only composition studies. Inputs have already passed the public-content boundary. */
export function renderArtistShareProposal(name: string, portrait: string | null, publicBio: string | null | undefined, layout: 'editorial' | 'portrait' | 'profile' | 'story' | 'cover' | 'sleeve' | 'dossier', palette: 'white' | 'logo' | 'pink' = 'white', cta: 'know' | 'music' | 'meet' | 'explore' | 'story' | 'read' = 'know') {
    if (layout === 'cover' || layout === 'sleeve' || layout === 'dossier') return renderArtistArtDirection(name, portrait, publicBio, layout, palette, cta);
    if (layout === 'story') return renderArtistStoryProposal(name, portrait, publicBio, palette === 'pink' ? 'white' : palette, cta === 'read' ? 'know' : cta);
    const chars = Array.from(getShareArtistName(name));
    const displayName = chars.length > 90 ? `${chars.slice(0, 89).join('')}…` : chars.join('');
    const long = chars.length > 24;
    const background = palette === 'logo' ? '#fb57c0' : '#ffffff';
    const excerpt = getShareBioExcerpt(publicBio, long ? 90 : layout === 'profile' ? 150 : 125);
    const imageWidth = layout === 'portrait' ? 640 : layout === 'editorial' ? 440 : 196;
    const imageHeight = layout === 'portrait' ? 630 : layout === 'editorial' ? 440 : 196;
    const image = <div style={{ display: 'flex', width: imageWidth, height: imageHeight, flexShrink: 0, overflow: 'hidden', borderRadius: layout === 'profile' ? '50%' : 0, background: '#f1f1f1', alignItems: 'center', justifyContent: 'center' }}>
        {portrait
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={portrait} alt="" width={imageWidth} height={imageHeight} style={{ objectFit: 'cover' }} />
            : <div style={{ display: 'flex', width: imageWidth * .7, height: imageWidth * .7, borderRadius: '50%', background: '#171717', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: imageWidth * .14, height: imageWidth * .14, borderRadius: '50%', background }} />
            </div>}
    </div>;
    const title = <div style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: long ? 3 : 2, textOverflow: 'ellipsis', overflow: 'visible', paddingRight: 24, fontSize: long ? 42 : layout === 'profile' ? 82 : 64, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-1.5px', wordBreak: 'break-word', paddingBottom: 6 }}>{displayName}</div>;
    const bio = excerpt ? <div style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: layout === 'profile' ? 4 : long ? 3 : 5, textOverflow: 'ellipsis', overflow: 'visible', paddingRight: 24, fontSize: layout === 'profile' ? 34 : 32, lineHeight: 1.32, wordBreak: 'break-word' }}>{excerpt}</div> : null;
    const invitation = <div style={{ display: 'flex', width: layout === 'portrait' ? 472 : 960, fontSize: 28, lineHeight: 1.2, wordBreak: 'break-word' }}>{getShareCallToAction(name, cta, Boolean(excerpt))}</div>;
    return new ImageResponse(
        <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', background, color: '#171717', fontFamily: 'Inter' }}>
            {layout === 'editorial' && <>
                <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', left: 56, top: 56, width: 580 }}>
                    {title}<div style={{ display: 'flex', marginTop: 28 }}>{bio}</div>
                </div>
                <div style={{ display: 'flex', position: 'absolute', left: 712, top: 48, width: 440, height: 440 }}>{image}</div>
                <div style={{ display: 'flex', position: 'absolute', left: 56, bottom: 54 }}>{invitation}</div>
            </>}
            {layout === 'portrait' && <>
                {image}
                <div style={{ display: 'flex', flexDirection: 'column', width: 560, padding: '52px 44px', background }}>
                    {title}<div style={{ display: 'flex', marginTop: 26 }}>{bio}</div>
                </div>
                <div style={{ display: 'flex', position: 'absolute', left: 684, bottom: 142 }}>{invitation}</div>
            </>}
            {layout === 'profile' && <>
                <div style={{ display: 'flex', position: 'absolute', left: 56, top: 48, width: 1088 }}>{title}</div>
                <div style={{ display: 'flex', position: 'absolute', left: 56, top: 260 }}>{image}</div>
                <div style={{ display: 'flex', position: 'absolute', left: 300, top: 260, width: 824 }}>{bio}</div>
                <div style={{ display: 'flex', position: 'absolute', left: 56, bottom: 54 }}>{invitation}</div>
            </>}
            <div style={{ display: 'flex', position: 'absolute', right: 48, bottom: 40 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shareGlasses} alt="Music Nerd glasses" width={86} height={61} />
            </div>
        </div>,
        { width: 1200, height: 630, fonts: shareImageFonts, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } },
    );
}

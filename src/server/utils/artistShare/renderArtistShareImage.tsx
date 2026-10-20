import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getShareBioExcerpt } from '@/lib/artistShare/getShareBioExcerpt';
import { ImageResponse } from 'next/og';
import { getShareArtistName } from '@/lib/artistShare/getShareArtistName';

// Exact repository artwork, embedded locally: no asset/font request during rendering.
const brandLogo = `data:image/png;base64,${readFileSync(join(process.cwd(), 'public/music-nerd-shades.png')).toString('base64')}`;

/** Receives only public display content and already-normalized portrait bytes. */
export function renderArtistShareImage(name: string, portrait: string | null, publicBio?: string | null) {
    const chars = Array.from(getShareArtistName(name));
    const displayName = chars.length > 90 ? `${chars.slice(0, 89).join('')}…` : chars.join('');
    const excerpt = getShareBioExcerpt(publicBio, chars.length > 40 ? 90 : 130);
    return new ImageResponse(
        <div style={{ display: 'flex', width: '100%', height: '100%', background: '#101010', color: '#fff', padding: 48, fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', width: 480, height: 534, borderRadius: 24, overflow: 'hidden', background: '#ff75d8', alignItems: 'center', justifyContent: 'center' }}>
                {portrait
                    // ImageResponse consumes normalized inline PNGs, not Next Image.
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={portrait} alt="" width={480} height={534} style={{ objectFit: 'cover' }} />
                    : <div style={{ display: 'flex', width: 360, height: 360, borderRadius: '50%', border: '24px solid #282128', background: '#101010', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', width: 112, height: 112, background: '#ff75d8', borderRadius: '50%', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 22, height: 22, background: '#101010', borderRadius: '50%' }} />
                        </div>
                    </div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', width: 560, paddingLeft: 48, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 24 }}>
                    <div style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: chars.length > 22 ? 3 : 2, textOverflow: 'ellipsis', overflow: 'hidden', fontSize: chars.length > 40 ? 36 : chars.length > 22 ? 52 : 72, fontWeight: 700, lineHeight: 1.2, paddingBottom: 6, letterSpacing: '-1px', wordBreak: 'break-word' }}>{displayName}</div>
                    {excerpt && <div style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 4, textOverflow: 'ellipsis', overflow: 'hidden', marginTop: 28, color: '#dedade', fontSize: 38, lineHeight: 1.3, wordBreak: 'break-word' }}>{excerpt}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ display: 'flex', padding: 12, background: '#ff75d8', borderRadius: 12 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={brandLogo} alt="Music Nerd glasses" width={84} height={60} />
                    </div>
                    <div style={{ display: 'flex', fontSize: 28, color: '#dedade' }}>musicnerd.net</div>
                </div>
            </div>
        </div>,
        { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } },
    );
}

import { ImageResponse } from 'next/og';

/** Receives only a public display name and already-normalized image bytes. */
export function renderArtistShareImage(name: string, portrait: string | null) {
    // The bundled Latin font must not trigger implicit Google-font/emoji network calls.
    // Keep the original full name in page metadata; use neutral copy for unsupported scripts.
    const normalized = name.trim().replace(/\s+/g, ' ') || 'Unknown Artist';
    const safeName = /^[\x20-\x7e]*$/.test(normalized) ? normalized : 'Discover this artist';
    const chars = Array.from(safeName);
    const displayName = chars.length > 90 ? `${chars.slice(0, 89).join('')}…` : chars.join('');
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
                <div style={{ display: 'flex', color: '#ff75d8', fontSize: 30, fontWeight: 700 }}>Music Nerd</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', fontSize: chars.length > 40 ? 44 : chars.length > 22 ? 58 : 76, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-2px', wordBreak: 'break-word' }}>{displayName}</div>
                    <div style={{ display: 'flex', marginTop: 28, color: '#d7cfd5', fontSize: 27, lineHeight: 1.35 }}>The music is only half the story.</div>
                </div>
                <div style={{ display: 'flex', fontSize: 23, color: '#ff75d8' }}>musicnerd.net</div>
            </div>
        </div>,
        { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } },
    );
}

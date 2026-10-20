import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { SUPABASE_URL } from '@/env';
import { eligibleSharePortrait } from '@/lib/artistShare/eligibleSharePortrait';

/** Bounded, credential-free public image read. Decode before handing data to Satori. */
export async function loadSharePortrait(value: string | null, artistId: string): Promise<string | null> {
    const url = eligibleSharePortrait(value, artistId, SUPABASE_URL);
    if (!url) return null;
    const maxBytes = 5 * 1024 * 1024;
    try {
        let bytes: Buffer;
        if (url.startsWith('/artist-images/')) {
            bytes = await readFile(path.join(process.cwd(), 'public', url));
        } else {
            const response = await fetch(url, { redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(5000), cache: 'no-store' });
            if (!response.ok || !/^image\/(png|jpeg|webp)(;|$)/i.test(response.headers.get('content-type') ?? '')
                || Number(response.headers.get('content-length')) > maxBytes || !response.body) return null;
            const reader = response.body.getReader();
            const chunks: Uint8Array[] = [];
            let length = 0;
            try {
                while (true) {
                    const { done, value: chunk } = await reader.read();
                    if (done) break;
                    length += chunk.length;
                    if (length > maxBytes) return null;
                    chunks.push(chunk);
                }
            } finally { await reader.cancel(); }
            bytes = Buffer.concat(chunks);
        }
        if (bytes.length > maxBytes) return null;
        const png = await sharp(bytes, { limitInputPixels: 25_000_000 }).rotate().resize(480, 534, { fit: 'cover' }).png().toBuffer();
        return `data:image/png;base64,${png.toString('base64')}`;
    } catch { return null; }
}

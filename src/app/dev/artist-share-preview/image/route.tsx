import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { renderArtistShareImage } from '@/server/utils/artistShare/renderArtistShareImage';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    if (process.env.NODE_ENV !== 'development' && process.env.VERCEL_ENV !== 'preview') return new Response(null, { status: 404 });
    const scenario = new URL(request.url).searchParams.get('case');
    const portrait = scenario === 'normal'
        ? `data:image/png;base64,${(await readFile(path.join(process.cwd(), 'public/demo/pete-rango-logo.png'))).toString('base64')}`
        : null;
    return renderArtistShareImage(scenario === 'long' ? 'The Extraordinary Ensemble of Midnight Dreamers and Their Incredibly Long Artist Name' : scenario === 'unicode' ? '坂本龍一' : 'Pete Rango', portrait);
}

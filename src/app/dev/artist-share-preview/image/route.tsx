import { getShareProposalOptions } from '@/lib/artistShare/getShareProposalOptions';
import { renderArtistShareProposal } from '@/server/utils/artistShare/renderArtistShareProposal';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { artistSharePreviewCases } from '../artistSharePreviewCases';
import { renderArtistShareImage } from '@/server/utils/artistShare/renderArtistShareImage';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    if (process.env.NODE_ENV !== 'development' && process.env.VERCEL_ENV !== 'preview') return new Response(null, { status: 404 });
    const scenario = new URL(request.url).searchParams.get('case');
    const example = artistSharePreviewCases.find(value => value.key === scenario) ?? artistSharePreviewCases[0];
    const portrait = scenario === 'normal'
        ? `data:image/png;base64,${(await readFile(path.join(process.cwd(), 'public/demo/pete-rango-logo.png'))).toString('base64')}`
        : null;
    const requestedPalette = new URL(request.url).searchParams.get('palette');
    const palette = requestedPalette === 'pink' || requestedPalette === 'logo' ? requestedPalette : 'white';
    const proposal = getShareProposalOptions(new URL(request.url).searchParams, true);
    return proposal ? renderArtistShareProposal(example.name, portrait, null, proposal.layout, proposal.palette, proposal.cta) : renderArtistShareImage(example.name, portrait, null, palette);
}

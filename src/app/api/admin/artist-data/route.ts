import { requireAdmin } from '@/lib/auth-helpers';
import { getArtistDataSummary, type ArtistDataSummary } from '@/server/utils/queries/artistDataQueries';

export const dynamic = "force-dynamic";

// In-memory cache with 30s TTL
let cached: { data: ArtistDataSummary; timestamp: number } | null = null;
const CACHE_TTL = 30_000;

export async function GET() {
  const t0 = performance.now();
  try {
    const auth = await requireAdmin();
    if (!auth.authenticated) return auth.response;

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.debug(`[artist-data] GET (cached) ${Math.round(performance.now() - t0)}ms`);
      return Response.json(cached.data);
    }

    const data = await getArtistDataSummary();
    cached = { data, timestamp: Date.now() };
    console.debug(`[artist-data] GET ${Math.round(performance.now() - t0)}ms`);
    return Response.json(data);
  } catch (e) {
    console.error('[artist-data] GET error', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

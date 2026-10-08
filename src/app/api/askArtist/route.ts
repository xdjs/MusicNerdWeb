import { MUSICNERD_RESEARCH_API_KEY } from '@/env';
import { handleArtistQuestion } from '@/server/utils/questionResearch/handleArtistQuestion';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
/** The paired API key enables the new flow. Runtime failures never fall back to legacy evidence. */
export async function POST(request: Request) {
  if (MUSICNERD_RESEARCH_API_KEY) return handleArtistQuestion(request);
  const { legacyAskArtist } = await import('@/server/utils/questionResearch/legacyAskArtist');
  return legacyAskArtist(request);
}

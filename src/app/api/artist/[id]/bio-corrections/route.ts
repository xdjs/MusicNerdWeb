import { BIO_CORRECTION_REPORT_LIMIT } from '@/lib/bio/types';
import { requireAuth } from '@/lib/auth-helpers';
import { validateBioCorrection } from '@/lib/bio/validateBioCorrection';
import { sanitizeBioText } from '@/lib/bio/bioText';
import { isRealBio } from '@/lib/bio/bioConstants';
import { getArtistById } from '@/server/utils/queries/artistQueries';
import { getLoreClaimGeneration } from '@/server/utils/queries/lorePersistence';
import { getPublicArtistAbout } from '@/server/utils/bio/getPublicArtistAbout';
import { submitBioCorrection } from '@/server/utils/bio/submitBioCorrection';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;
  const { id } = await params;
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return Response.json({ error: 'Invalid artist ID' }, { status: 400 });
  const raw = await request.text();
  if (raw.length > 18000) return Response.json({ error: 'Report is too long' }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return Response.json({ error: 'Invalid report' }, { status: 400 }); }
  const input = validateBioCorrection(body);
  if (!input) return Response.json({ error: 'Choose a reason and enter valid details or a public source URL' }, { status: 400 });
  try {
    const artist = await getArtistById(id);
    if (!artist) return Response.json({ error: 'Artist not found' }, { status: 404 });
    const claimed = await getLoreClaimGeneration(id);
    const bio = sanitizeBioText(claimed ? artist.bio : (await getPublicArtistAbout(id))?.bio);
    if (!bio || !isRealBio(bio) || bio !== input.expectedBio) return Response.json({ error: 'This About has changed. Reload the profile before sending your suggestion.' }, { status: 409 });
    const result = await submitBioCorrection(auth.userId, id, input, bio);
    if (result === 'limited') return Response.json({ error: `You have sent ${BIO_CORRECTION_REPORT_LIMIT} reports in the past 24 hours. Please try again when an earlier report is more than 24 hours old.` }, { status: 429 });
    return Response.json({ success: true, duplicate: result === 'duplicate' }, { status: result === 'created' ? 201 : 200 });
  } catch {
    return Response.json({ error: 'Could not save your suggestion. Please try again.' }, { status: 500 });
  }
}

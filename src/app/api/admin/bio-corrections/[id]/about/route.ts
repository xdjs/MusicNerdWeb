import { requireAdmin } from '@/lib/auth-helpers';
import { CorrectionAboutConflict } from '@/lib/bio/correctionAboutTypes';
import { MAX_BIO_LENGTH } from '@/lib/bio/bioConstants';
import { getCorrectionAbout } from '@/server/utils/bio/getCorrectionAbout';
import { saveCorrectionAbout } from '@/server/utils/bio/saveCorrectionAbout';

const validId = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  const auth = await requireAdmin();
  if (!auth.authenticated) return auth.response;
  const { id } = await params;
  if (!validId.test(id)) return Response.json({ error: 'Invalid report ID' }, { status: 400 });
  try {
    const { bio, revision } = await getCorrectionAbout(id);
    return Response.json({ bio, revision }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return Response.json({ error: error instanceof CorrectionAboutConflict ? error.message : 'Could not load the current About. Try again.' }, { status: error instanceof CorrectionAboutConflict ? 409 : 500 });
  }
}
export async function PUT(request: Request, { params }: Context) {
  const auth = await requireAdmin();
  if (!auth.authenticated) return auth.response;
  const { id } = await params;
  if (!validId.test(id)) return Response.json({ error: 'Invalid report ID' }, { status: 400 });
  const body = await request.json().catch(() => null);
  if (typeof body?.bio !== 'string' || !body.bio.trim() || body.bio.length > MAX_BIO_LENGTH || typeof body?.revision !== 'string' || !/^[a-f0-9]{64}$/.test(body.revision)) {
    return Response.json({ error: 'Enter a valid About and reload the editor if needed.' }, { status: 400 });
  }
  try {
    await saveCorrectionAbout(id, auth.userId, body.bio.trim(), body.revision);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error instanceof CorrectionAboutConflict ? error.message : 'Could not confirm the save. Your draft is kept; refresh the queue before retrying.' }, { status: error instanceof CorrectionAboutConflict ? 409 : 500 });
  }
}

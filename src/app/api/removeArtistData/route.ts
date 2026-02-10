import { requireAuth } from '@/lib/auth-helpers';
import { removeArtistData } from '@/server/utils/queries/artistQueries';

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) {
    return auth.response;
  }

  let body: { artistId?: string; siteName?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { artistId, siteName } = body;
  if (!artistId || !siteName) {
    return Response.json(
      { error: 'artistId and siteName are required' },
      { status: 400 },
    );
  }

  try {
    const result = await removeArtistData(artistId, siteName);
    if (result.status === 'error') {
      return Response.json({ error: result.message }, { status: 403 });
    }
    return Response.json({ success: true, message: result.message });
  } catch (error) {
    console.error('[removeArtistData] Error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

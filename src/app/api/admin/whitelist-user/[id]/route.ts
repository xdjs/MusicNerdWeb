import { requireAdmin } from '@/lib/auth-helpers';
import { updateWhitelistedUser } from '@/server/utils/queries/userQueries';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.authenticated) {
      return auth.response;
    }

    const { id } = await params;
    const body = await request.json();
    const { wallet, email, username, isAdmin, isWhiteListed, isHidden } = body;

    const result = await updateWhitelistedUser(id, {
      wallet,
      email,
      username,
      isAdmin,
      isWhiteListed,
      isHidden,
    });

    if (result.status === 'success') {
      return Response.json({ message: result.message }, { status: 200 });
    }

    return Response.json({ error: result.message }, { status: 400 });
  } catch (e) {
    console.error('[whitelist-user] PUT error', e);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

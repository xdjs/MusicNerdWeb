import { getServerAuthSession } from '@/server/auth';
import type { Session } from '@/server/auth';
import { getUserById } from '@/server/utils/queries/userQueries';

type AuthSuccess = { authenticated: true; session: Session; userId: string };
type AuthFailure = { authenticated: false; response: Response };
type AuthResult = AuthSuccess | AuthFailure;

/**
 * Require an authenticated session. Returns 401 if not authenticated.
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return {
      authenticated: false,
      response: Response.json({ error: 'Not authenticated' }, { status: 401 }),
    };
  }
  return { authenticated: true, session, userId: session.user.id };
}

/**
 * Require an admin session. Returns 401 if not authenticated, 403 if not admin.
 */
export async function requireAdmin(): Promise<AuthResult> {
  const authResult = await requireAuth();
  if (!authResult.authenticated) {
    return authResult;
  }

  const dbUser = await getUserById(authResult.userId);
  if (!dbUser?.isAdmin) {
    return {
      authenticated: false,
      response: Response.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return authResult;
}

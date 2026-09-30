import { needsUserName } from '@/lib/user/needsUserName';
import { setUserName } from './setUserName';

/** Optional public-name setup must not reject an already verified identity. */
export async function assignSessionUserName<T extends { id: string; username: string | null; wallet: string | null }>(user: T) {
  if (!needsUserName(user)) return user;
  try {
    return { ...user, ...await setUserName(user.id) };
  } catch {
    // Do not fall back to the historical email/wallet-backed username. The JWT
    // keeps a pending marker so a later authenticated request retries allocation.
    console.warn('[Auth] Public user name assignment deferred; session refresh will retry.');
    return { ...user, username: null };
  }
}

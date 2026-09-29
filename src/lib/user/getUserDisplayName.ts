import { needsUserName } from './needsUserName';

/** Public credits must remain safe while optional name allocation is pending. */
export function getUserDisplayName(user: { username?: string | null; email?: string | null; wallet?: string | null }): string {
  return needsUserName(user) ? 'Anonymous' : user.username!.trim();
}

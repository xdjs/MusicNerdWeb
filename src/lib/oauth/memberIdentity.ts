import type { MusicNerdUser } from '@/hooks/useMusicNerdUser';

/**
 * Who the OAuth pages say is signed in: the Music Nerd username, else the
 * email, with the email shown beside the name only when they differ.
 *
 * @param user - The Music Nerd account, once loaded.
 * @param privyEmail - The Privy login email, known before the account loads.
 * @returns The name, the email to show under it (or null) and the avatar initial.
 */
export function memberIdentity(
  user: Pick<MusicNerdUser, 'username' | 'email'> | null,
  privyEmail: string | undefined,
): { name: string; email: string | null; initial: string } {
  const email = user?.email ?? privyEmail ?? null;
  const name = user?.username || email || 'You';
  return { name, email: email === name ? null : email, initial: name.charAt(0).toUpperCase() };
}

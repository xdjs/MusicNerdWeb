import { signOut } from 'next-auth/react';

/**
 * Sign the member out of NextAuth, then Privy. Callers reload afterwards so
 * every part of the page starts signed out.
 *
 * @param privyLogout - `logout` from Privy's `useLogout`.
 */
export async function signOutEverywhere(privyLogout: () => Promise<void>): Promise<void> {
  await signOut({ redirect: false });
  await privyLogout();
}

/** After signIn synchronizes SessionProvider, verify the correction session without reloading. */
export async function resumeCorrectionSession(
  pathname: string,
  readSession: () => Promise<{ user?: unknown } | null>,
): Promise<boolean> {
  const artistId = /^\/artist\/([^/]+)\/?$/.exec(pathname)?.[1];
  if (!artistId) return false;
  let hasDraft = false;
  try { hasDraft = sessionStorage.getItem(`mn:bio-correction:${artistId}`) !== null; }
  catch { return false; }
  if (!hasDraft) return false;
  const session = await readSession();
  if (!session?.user) throw new Error('Sign-in could not finish. Please try again.');
  return true;
}

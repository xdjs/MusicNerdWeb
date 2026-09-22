/** Legacy stored portraits must be local paths or credential-free HTTPS URLs. */
export function normalizeStoredArtistImage(value: string | null | undefined): string | null {
  const stored = value?.trim();
  if (!stored || /default|placeholder|musicnerdlogo/i.test(stored)) return null;
  if (stored.startsWith('/') && !stored.startsWith('//') && !stored.includes('\\')) return stored;
  try {
    const url = new URL(stored);
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null;
  } catch { return null; }
}

import { getAccessToken } from '@privy-io/react-auth';
import { musicNerdApiUrl } from '@/lib/musicNerdApi/musicNerdApiUrl';

/**
 * Download the Lore document as Markdown from MusicNerdAPI. The export needs the
 * Privy token, so it is fetched and saved as a blob instead of a plain link; the
 * file name comes from the API's `Content-Disposition` header.
 */
export async function downloadKnowledgeDoc(artistId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Please sign in again to download Lore.');
  const response = await fetch(musicNerdApiUrl(`/api/artist/${artistId}/knowledge-doc/export`), {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'omit',
    cache: 'no-store',
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error ?? 'Download failed. Please try again.');
  }
  const name = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ?? 'lore.md';
  const href = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = href;
  link.download = name;
  link.click();
  URL.revokeObjectURL(href);
}

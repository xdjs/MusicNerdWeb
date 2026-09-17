'use client';

import {useState, type ReactNode} from 'react';

/** Provider resolution is lazy and cannot hold up the account summary. */
export default function CollectionArtistImage({artistId, imageUrl, className, fallback}: {artistId: string; imageUrl?: string | null; className: string; fallback: ReactNode}) {
  const stored = imageUrl?.trim();
  let portrait: string | null = null;
  if (stored && !/default|placeholder|musicnerdlogo/i.test(stored)) {
    if (stored.startsWith('/') && !stored.startsWith('//') && !stored.includes('\\')) portrait = stored;
    else {
      try {
        const url = new URL(stored);
        if (url.protocol === 'https:' && !url.username && !url.password) portrait = url.toString();
      } catch {
        // Invalid legacy values use the provider resolver below.
      }
    }
  }
  const source = portrait ?? `/api/artist/${encodeURIComponent(artistId)}/image`;
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (failedSource === source) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={source} alt="" className={className} loading="lazy" onError={() => setFailedSource(source)} />;
}

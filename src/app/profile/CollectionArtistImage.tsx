'use client';

import {useState, type ReactNode} from 'react';

/** Provider resolution is lazy and cannot hold up the account summary. */
export default function CollectionArtistImage({artistId, imageUrl, className, fallback}: {artistId: string; imageUrl?: string | null; className: string; fallback: ReactNode}) {
  const source = imageUrl?.trim() || `/api/artist/${encodeURIComponent(artistId)}/image`;
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (failedSource === source) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={source} alt="" className={className} loading="lazy" onError={() => setFailedSource(source)} />;
}

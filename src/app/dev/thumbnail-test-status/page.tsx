import { notFound } from 'next/navigation';
import { authorizeThumbnailQueueRead } from '@/app/actions/authorizeThumbnailQueueRead';
import ThumbnailTestStatus from './ThumbnailTestStatus';

export const dynamic = 'force-dynamic';

/** Only the current authorized test owner can open this temporary preview view. */
export default async function ThumbnailTestStatusPage() {
  const artistId = await authorizeThumbnailQueueRead();
  if (!artistId) notFound();
  return <ThumbnailTestStatus artistId={artistId} />;
}

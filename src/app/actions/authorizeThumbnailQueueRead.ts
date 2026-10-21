'use server';
import { getServerAuthSession } from '@/server/auth';
import { canEditArtist } from '@/server/utils/artistEditAuth';
import { isThumbnailPreviewTest } from '@/server/utils/source/isThumbnailPreviewTest';

/** Recheck the temporary experiment and ordinary edit permission on every read. */
export async function authorizeThumbnailQueueRead(): Promise<string | null> {
  let scope: { artistId?: string; url?: string };
  try { scope = JSON.parse(process.env.MN_THUMBNAIL_TEST_SCOPE ?? ''); }
  catch { return null; }
  if (!scope || typeof scope.artistId !== 'string' || typeof scope.url !== 'string'
    || !isThumbnailPreviewTest(scope.artistId, scope.url)) return null;
  const session = await getServerAuthSession();
  if (!session || !(await canEditArtist(session.user.id, scope.artistId))) return null;
  return scope.artistId;
}

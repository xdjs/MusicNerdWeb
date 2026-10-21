'use server';
import { getServerAuthSession } from '@/server/auth';
import { cancelThumbnailTestJob } from '@/server/utils/source/cancelThumbnailTestJob';

/** Temporary authenticated exact test cleanup; accepts no caller-selected target. */
export async function cleanupThumbnailTestJob() {
  const session = await getServerAuthSession();
  if (!session) throw new Error('Sign in as the current test artist owner');
  return cancelThumbnailTestJob(session.user.id);
}

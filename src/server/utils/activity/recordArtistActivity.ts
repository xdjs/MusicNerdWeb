import { db } from '@/server/db/drizzle';
import { artistActivityEvents } from '@/server/db/schema';
import { getArtistOperationOwnership } from '../artistOperationContext';

/** Append a server-attributed request/change. Never continue research if this fails. */
export async function recordArtistActivity(artistId: string, action: string, options: {
  userId?: string; trigger?: string; actorKind?: 'user' | 'system' | 'unknown';
  sourceId?: string; parentActivityId?: string;
} = {}, writer: Pick<typeof db, 'insert'> = db): Promise<string> {
  const context = getArtistOperationOwnership(artistId);
  const userId = options.userId ?? context?.userId;
  const [event] = await writer.insert(artistActivityEvents).values({
    artistId, action, actorUserId: userId ?? null,
    actorKind: userId ? 'user' : options.actorKind ?? 'unknown',
    trigger: options.trigger ?? context?.trigger ?? 'unrecorded',
    sourceId: options.sourceId ?? null,
    parentActivityId: options.parentActivityId ?? context?.activityId ?? null,
  }).returning({ id: artistActivityEvents.id });
  if (!event) throw new Error('Could not record artist activity');
  return event.id;
}

'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getServerAuthSession } from '@/server/auth';
import { setSourcePublication } from '@/server/utils/contributions/setSourcePublication';

/** Authenticated admin decision on one reviewed source revision; never an artist claim. */
export async function setSourcePublicationAction(input: unknown) {
  const parsed = z.object({
    sourceId: z.string().uuid(),
    publication: z.enum(['inherit', 'public', 'private']),
    expectedUpdatedAt: z.string().max(64).refine(value => Number.isFinite(Date.parse(value))).nullable(),
  }).strict().safeParse(input);
  if (!parsed.success) return { success: false, error: 'Invalid publication decision.' };
  const session = await getServerAuthSession();
  if (!session?.user?.id) return { success: false, error: 'Not authenticated.' };
  try {
    const source = await setSourcePublication(session.user.id, parsed.data);
    revalidatePath(`/artist/${source.artistId}`);
    return { success: true, source };
  } catch {
    return { success: false, error: 'Publication decision failed. Confirm admin access and reload the source.' };
  }
}

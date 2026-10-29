import type { ContributorApprovalItem } from '@/lib/contributions/contributorApprovalTypes';
import { readAdminResponse } from './readAdminResponse';
import { requestAdminApi } from './requestAdminApi';

/**
 * A contributor's pending submissions across every artist, from MusicNerdAPI.
 *
 * @param contributorId - The contributor's user id.
 * @returns Up to 200 items, and whether more are pending.
 */
export async function listPendingSubmissions(contributorId: string): Promise<{ items: ContributorApprovalItem[]; hasMore: boolean }> {
  const response = await requestAdminApi(`/api/admin/users/${encodeURIComponent(contributorId)}/submissions`);
  const body = await readAdminResponse<{ items: ContributorApprovalItem[]; hasMore: boolean }>(response, 'Could not load pending submissions.');
  return { items: body.items, hasMore: body.hasMore };
}

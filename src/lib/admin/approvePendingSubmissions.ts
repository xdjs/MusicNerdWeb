import type { ContributorSubmission } from '@/lib/contributions/contributorApprovalTypes';
import { readAdminResponse } from './readAdminResponse';
import { requestAdminApi } from './requestAdminApi';

type ApprovalCounts = { approved: number; skipped: number; failed: number; warning?: string };

/**
 * Approve up to 10 of a contributor's pending submissions through MusicNerdAPI.
 *
 * @param contributorId - The contributor's user id.
 * @param items - The submissions.
 * @returns The approved, skipped and failed counts, and any warning.
 */
export async function approvePendingSubmissions(contributorId: string, items: ContributorSubmission[]): Promise<ApprovalCounts> {
  const response = await requestAdminApi(`/api/admin/users/${encodeURIComponent(contributorId)}/submissions/approve`, { method: 'POST', body: { items } });
  const { approved, skipped, failed, warning } = await readAdminResponse<ApprovalCounts>(response, 'Review could not be confirmed. Refresh before retrying.');
  return { approved, skipped, failed, ...(warning ? { warning } : {}) };
}

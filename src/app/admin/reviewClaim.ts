import { requestAdminApi } from '@/lib/admin/requestAdminApi';

export type ClaimReview = 'approve' | 'reject' | 'revoke';

/**
 * Approve, reject or revoke a claim on MusicNerdAPI as the signed-in admin.
 *
 * @param claimId - The claim.
 * @param action - What to do with it.
 * @returns Whether it worked, with an approval's warning or the API's error.
 */
export async function reviewClaim(claimId: string, action: ClaimReview): Promise<{ success: boolean; error?: string; warning?: string }> {
  const response = await requestAdminApi(`/api/admin/claims/${encodeURIComponent(claimId)}/${action}`, { method: 'POST' });
  const body = (await response.json().catch(() => ({}))) as { warning?: string; error?: string };
  if (!response.ok) return { success: false, error: body.error };
  return { success: true, ...(body.warning ? { warning: body.warning } : {}) };
}

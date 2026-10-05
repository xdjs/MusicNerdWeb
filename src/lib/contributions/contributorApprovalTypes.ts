export type ContributorSubmission = { id: string; type: 'link' | 'lore' | 'upload' };
export type ContributorApprovalItem = ContributorSubmission & {
  title: string | null; artistName: string | null; url: string | null;
};
export const CONTRIBUTOR_PREVIEW_LIMIT = 200;
export const CONTRIBUTOR_APPROVAL_BATCH = 10;

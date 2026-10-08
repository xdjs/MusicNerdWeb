export const LORE_APPROVAL_BATCH = 10;

export type LoreApprovalResult = {
  success: boolean;
  approvedIds: string[];
  skippedIds: string[];
  failedIds: string[];
  warning?: string;
  error?: string;
};

import type { ReviewItem, ReviewType } from '@/lib/contributions/adminReviewTypes';

/** One page of `GET /api/admin/review-queue`, its filters flattened in. */
export type ReviewQueue = {
  items: ReviewItem[];
  counts: Record<ReviewType, number>;
  pendingCounts: Record<ReviewType, number>;
  total: number;
  page: number;
  pageSize: number;
  type: ReviewType | 'all';
  query: string;
};

/** One entry of `GET /api/admin/activity`. */
export type ArtistActivityEntry = {
  id: string;
  artistId: string;
  artistName: string | null;
  action: string;
  trigger: string;
  actorKind: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  createdAt: string;
  sourceId: string | null;
};

/** One page of `GET /api/admin/activity`, its filters flattened in. */
export type ArtistActivityPage = {
  items: ArtistActivityEntry[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  action: string;
  eventId: string;
};

/** One contribution of `GET /api/admin/contributions`. */
export type Contribution = {
  id: string; type: 'link' | 'lore' | 'upload'; origin: 'user' | 'research' | 'unknown';
  artistId: string; artistName: string | null; title: string | null; url: string | null;
  userId: string | null; username: string | null; email: string | null; actorKind: string | null;
  status: string; createdAt: string | null; trigger: string | null; activityId: string | null;
};

/** Contributions per origin: every match and the pending ones. */
export type ContributionCounts = Record<Contribution['origin'], { total: number; pending: number }>;

/** The contributor `GET /api/admin/contributions` returns for `userId`. */
export type ContributionAccount = { id: string; username: string | null; email: string | null };

/** One page of `GET /api/admin/contributions`, its filters flattened in. */
export type ContributionsPage = {
  items: Contribution[];
  counts: ContributionCounts;
  total: number;
  page: number;
  pageSize: number;
  userId: string;
  query: string;
  origin: string;
  type: string;
  status: string;
  account: ContributionAccount | null;
};

/** One account of `GET /api/admin/users`. */
export type AdminUser = {
  id: string;
  username: string | null;
  email: string | null;
  wallet: string | null;
  isAdmin: boolean;
  isWhiteListed: boolean;
  isHidden: boolean;
  updatedAt: string;
};

/** One claim of `GET /api/admin/claims`. */
export type AdminClaim = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  referenceCode: string | null;
  artistId: string;
  artistName: string | null;
  artistInstagram: string | null;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  createdAt: string;
};

/** One key of `GET /api/admin/mcp-keys`. */
export type McpKey = { id: string; label: string; keyHashPrefix: string; createdAt: string; revokedAt: string | null };

/** A paged admin response: page `T` with the filters `K` nested under `filters`. */
export type PagedResponse<T, K extends keyof T> = Omit<T, K> & { status: 'ok'; filters: Pick<T, K> };

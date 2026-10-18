export type ReviewType = 'links' | 'sources' | 'corrections';

/** Minimal private admin projection; source bodies and account emails stay server-side. */
export type ReviewItem = {
  type: ReviewType;
  id: string;
  artistId: string;
  artistName: string | null;
  title: string | null;
  url: string | null;
  createdAt: string | null;
  origin: string;
  actorKind?: string | null;
  actorName: string | null;
  actorId: string | null;
  activityId: string | null;
  trigger: string | null;
  bioSnapshot: string | null;
  details: string | null;
  reason: string | null;
};

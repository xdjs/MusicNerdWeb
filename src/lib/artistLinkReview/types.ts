export type LinkSuggestion = {
  id: string; kind: 'ugc' | 'source'; url: string; title: string; platform: string;
  hidden?: boolean; status: 'pending' | 'approved' | 'rejected'; origin: string;
  submittedAt: string | null; suggestedBy: { id: string | null; name: string };
  reviewedAt: string | null; reviewedBy: { id: string | null; name: string } | null;
};
export type LinkReviewDecision = { id: string; kind: 'ugc' | 'source'; decision: 'approve' | 'dismiss' | 'remove' | 'restore' };

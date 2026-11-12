type Source = { id: string; artistId: string; activityId: string | null; origin: string };
type Activity = { id: string; artistId: string; sourceId: string | null; actorUserId: string | null; actorKind: string; action: string; trigger: string };

/** Retention is independent of publication/moderation status and current user roles. */
export function classifyRevokedSource(source: Source, activity: Activity | null, claimantId: string): 'retain' | 'delete' | 'review' {
    const expectedAction = source.origin === 'upload' ? 'source_upload' : source.origin === 'submission' ? 'source_submission' : null;
    const ownEvent = activity && activity.id === source.activityId && activity.artistId === source.artistId && activity.sourceId === source.id;
    if (expectedAction && ownEvent && activity.actorKind === 'user' && activity.actorUserId && activity.action === expectedAction) {
        if (activity.trigger === 'trusted_submission') return 'retain';
        if (activity.actorUserId === claimantId) return 'delete';
    }
    // Research is generated, not contributor-owned. Conflicting trusted provenance
    // is ambiguous and must not silently become permission to delete.
    if (source.origin === 'research' && activity?.trigger !== 'trusted_submission') return 'delete';
    return 'review';
}

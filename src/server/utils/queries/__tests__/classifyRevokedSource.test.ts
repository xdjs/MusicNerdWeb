import { classifyRevokedSource } from '../classifyRevokedSource';
const source = { id: 's', artistId: 'a', activityId: 'e', origin: 'upload' };
const event = { id: 'e', artistId: 'a', sourceId: 's', actorUserId: 'u', actorKind: 'user', action: 'source_upload', trigger: 'trusted_submission' };
it('retains a trusted submission even when its actor is the revoked claimant', () => {
    expect(classifyRevokedSource(source, event, 'u')).toBe('retain');
});
it.each(['id', 'artistId', 'sourceId', 'action', 'actorKind'])('rejects mismatched provenance: %s', key => {
    expect(classifyRevokedSource(source, { ...event, [key]: 'wrong' }, 'other')).toBe('review');
});
it('does not infer legacy trust or trust from a missing actor', () => {
    expect(classifyRevokedSource(source, null, 'u')).toBe('review');
    expect(classifyRevokedSource(source, { ...event, actorUserId: null }, 'u')).toBe('review');
});
it('deletes attributable claimant content but blocks unrelated untrusted content', () => {
    expect(classifyRevokedSource(source, { ...event, trigger: 'dashboard' }, 'u')).toBe('delete');
    expect(classifyRevokedSource(source, { ...event, trigger: 'dashboard' }, 'other')).toBe('review');
});
it('deletes research but fails closed for contradictory trusted provenance', () => {
    expect(classifyRevokedSource({ ...source, origin: 'research' }, null, 'u')).toBe('delete');
    expect(classifyRevokedSource({ ...source, origin: 'research' }, event, 'u')).toBe('review');
});

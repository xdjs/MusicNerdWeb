import { selectProfileInterviewMix } from '../selectProfileInterviewMix';
import type { ProfileInterviewCandidate } from '../profileInterviewTypes';
const candidate = (key: string, kind: 'recent' | 'lore'): ProfileInterviewCandidate => ({
    signalId: key, key, kind, authoredBy: 'artist', material: key,
    sourceUrls: [`https://example.com/${key}`],
});
const recent = candidate('newest', 'recent');
const second = candidate('second', 'recent');
const lore = candidate('article', 'lore');
const checked = (c: ProfileInterviewCandidate) => ({ ...c, question: 'Which choice changed the direction of the work?', rationale: '' });
const history = { key: 'social_old', question: 'An older story?', rationale: '', kind: 'statement' as const, sourceUrls: ['https://example.com/old'] };
it('reserves fresh Latest and Lore ahead of model-ranked historical material', () => {
    const picked = selectProfileInterviewMix([history, ...[recent, second, lore].map(checked)], [recent, second, lore], false);
    expect(picked.map(q => q.key)).toEqual(['newest', 'article', 'second']);
});
it('occasionally includes history while retaining both fresh categories', () => {
    expect(selectProfileInterviewMix([history, ...[recent, second, lore].map(checked)], [recent, second, lore], true).map(q => q.key))
        .toEqual(['newest', 'article', 'social_old']);
});
it('keeps verified source-specific wording when available', () => {
    const draft = { ...history, key: recent.key, kind: 'recent' as const, question: 'A specific checked question?', sourceUrls: recent.sourceUrls };
    expect(selectProfileInterviewMix([history, draft], [recent], false)[0]?.question).toBe(draft.question);
});
it('fills empty categories and deduplicates underlying source URLs', () => {
    const duplicate = { ...lore, sourceUrls: recent.sourceUrls };
    const samePost = { ...history, sourceUrls: recent.sourceUrls };
    expect(selectProfileInterviewMix([checked(recent), samePost, history], [recent, duplicate], false).map(q => q.key))
        .toEqual(['newest', 'social_old']);
});

it('never substitutes a title-only template for missing or rejected drafts', () => {
    expect(selectProfileInterviewMix([], [recent, lore], false)).toEqual([]);
    expect(selectProfileInterviewMix([checked(second)], [recent, second, lore], false).map(q => q.key)).toEqual(['second']);
});

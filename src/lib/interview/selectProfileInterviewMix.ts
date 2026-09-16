import type { GroundedQuestion } from '@/server/utils/questionGenerator';
import type { ProfileInterviewCandidate } from './profileInterviewTypes';

/** Fresh sources lead; every third sitting may reserve one historical question. */
export function selectProfileInterviewMix(
    verified: GroundedQuestion[], candidates: ProfileInterviewCandidate[], includeHistory: boolean, max = 3,
): GroundedQuestion[] {
    const fresh = candidates.flatMap(candidate => {
        const question = verified.find(q => q.key === candidate.key);
        return question ? [question] : [];
    });
    const historical = verified.filter(q => q.kind !== 'recent' && q.kind !== 'lore');
    const picked: GroundedQuestion[] = [];
    const keys = new Set<string>();
    const urls = new Set<string>();
    const take = (pool: GroundedQuestion[], count = 1) => {
        for (const question of pool) {
            if (count <= 0 || picked.length >= max) break;
            if (keys.has(question.key) || question.sourceUrls.some(url => urls.has(url))) continue;
            picked.push(question);
            keys.add(question.key);
            question.sourceUrls.forEach(url => urls.add(url));
            count--;
        }
    };
    take(fresh.filter(q => q.kind === 'recent'));
    take(fresh.filter(q => q.kind === 'lore'));
    if (includeHistory) take(historical);
    take(fresh, max);
    take(historical, max);
    return picked;
}

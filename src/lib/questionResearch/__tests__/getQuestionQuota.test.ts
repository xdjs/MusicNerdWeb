import { getQuestionQuota } from '../getQuestionQuota';

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-15T19:00:00Z')); });
afterEach(() => { jest.useRealTimers(); });

it('keeps an expired absolute reset rather than starting another retry window', () => {
    expect(getQuestionQuota({ code: 'research_quota', resetAt: '2026-10-15T18:59:00Z', retryAfterSeconds: 600 }))
        .toEqual({ code: 'research_quota', resetAt: '2026-10-15T18:59:00.000Z' });
});
it('uses relative metadata once when an absolute reset is unavailable', () => {
    expect(getQuestionQuota({ code: 'saved_evidence_quota', retryAfterSeconds: 30 }))
        .toEqual({ code: 'saved_evidence_quota', resetAt: '2026-10-15T19:00:30.000Z' });
});
it.each([NaN, Infinity, -1, 86401])('keeps a quota with invalid relative reset %s explicit and never invents an early retry', seconds => {
    expect(getQuestionQuota({ code: 'question_planning_quota', resetAt: 'invalid', retryAfterSeconds: seconds }))
        .toEqual({ code: 'question_planning_quota' });
});
it('does not misclassify an ordinary provider throttle as a quota', () => {
    expect(getQuestionQuota({ code: 'provider_busy', error: 'Busy.' })).toBeUndefined();
});

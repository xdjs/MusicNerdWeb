import { getChatQuota } from '../getChatQuota';

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-27T19:00:00Z')); });
afterEach(() => { jest.useRealTimers(); });

/** The shape `DefaultChatTransport` throws for a non-200 response (an `APICallError`). */
const apiError = (statusCode: number, body: unknown) =>
    Object.assign(new Error('Failed'), { statusCode, responseBody: typeof body === 'string' ? body : JSON.stringify(body) });

it('reads the allowance from a 429 body the way askArtist sent it', () => {
    expect(getChatQuota(apiError(429, { status: 'error', code: 'visitor_question_quota', error: 'Limit.', retryAfterSeconds: 600, resetAt: '2026-10-27T19:10:00Z' })))
        .toEqual({ code: 'visitor_question_quota', resetAt: '2026-10-27T19:10:00.000Z' });
});

it('is not a quota for other errors, a 429 without a known code, or a body that is not JSON', () => {
    expect(getChatQuota(undefined)).toBeUndefined();
    expect(getChatQuota(new Error('offline'))).toBeUndefined();
    expect(getChatQuota(apiError(500, { code: 'visitor_question_quota' }))).toBeUndefined();
    expect(getChatQuota(apiError(429, { error: 'Too many requests' }))).toBeUndefined();
    expect(getChatQuota(apiError(429, 'Too many requests'))).toBeUndefined();
});

/** @jest-environment node */
let mockSecret = 'secret', mockEnabled = true, mockToken = 'token';
const mockQueue = jest.fn();
jest.mock('@/env', () => ({ get CRON_SECRET() { return mockSecret; }, get INSTAGRAM_REFRESH_ENABLED() { return mockEnabled; }, get APIFY_API_TOKEN() { return mockToken; } }));
jest.mock('@/server/utils/instagramRefresh/queueScheduledInstagram', () => ({ queueScheduledInstagram: () => mockQueue() }));
import { GET } from '../route';
if (!Response.json) Response.json = (data, init) => new Response(JSON.stringify(data), { ...init, headers: { 'Content-Type': 'application/json' } });
beforeEach(() => { mockSecret='secret'; mockEnabled=true; mockToken='token'; mockQueue.mockReset(); mockQueue.mockResolvedValue(2); });
it.each(['', 'Bearer wrong'])('rejects missing/incorrect cron credentials', async authorization => {
    expect((await GET(new Request('https://example.test', { headers: { authorization } }))).status).toBe(401);
    expect(mockQueue).not.toHaveBeenCalled();
});
it('rejects all callers when no server secret is configured', async () => {
    mockSecret='';
    expect((await GET(new Request('https://example.test'))).status).toBe(401);
    expect(mockQueue).not.toHaveBeenCalled();
});
it('stays disabled until explicitly configured', async () => {
    mockEnabled=false;
    expect(await (await GET(new Request('https://example.test', { headers: { authorization: 'Bearer secret' } }))).json()).toEqual({ queued: 0, disabled: true });
    expect(mockQueue).not.toHaveBeenCalled();
});
it('queues from an authenticated cron and reports database failures', async () => {
    const request = () => new Request('https://example.test', { headers: { authorization: 'Bearer secret' } });
    expect(await (await GET(request())).json()).toEqual({ queued: 2 });
    mockQueue.mockRejectedValue(new Error('database failure'));
    expect((await GET(request())).status).toBe(500);
});

/** @jest-environment node */
import { POST } from '../route';
import { handleArtistQuestion } from '@/server/utils/questionResearch/handleArtistQuestion';
jest.mock('@/server/utils/questionResearch/handleArtistQuestion', () => ({ handleArtistQuestion: jest.fn() }));
if (!Response.json) Response.json = (body, init) => new Response(JSON.stringify(body), { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
const artistId = '11111111-1111-4111-8111-111111111111';
const jobId = '22222222-2222-4222-8222-222222222222';
const context = { params: Promise.resolve({ id: artistId, jobId }) };
const request = (body: unknown) => new Request('https://web.example/result', { method: 'POST', body: JSON.stringify(body) });
beforeEach(() => { jest.clearAllMocks(); jest.mocked(handleArtistQuestion).mockResolvedValue(Response.json({ answer: 'Saved answer' })); });
it('binds result collection to URL artist/job and cannot become a new request', async () => {
 const response = await POST(request({ question: 'Who played drums?' }), context);
 expect(response.status).toBe(200);
 const input = jest.mocked(handleArtistQuestion).mock.calls[0][0];
 expect(await input.json()).toEqual({ artistId, jobId, question: 'Who played drums?' });
});
it.each([{ question: 'Question?', jobId: undefined, artistId }, { question: 'Question?', jobId: '33333333-3333-4333-8333-333333333333' }, { question: 'Question?', conversation: [] }, { question: '' }, { question: 'a'.repeat(501) }])('rejects a scope override or invalid question before calling the handler', async body => {
 expect((await POST(request(body), context)).status).toBe(400);
 expect(handleArtistQuestion).not.toHaveBeenCalled();
});
it('rejects invalid path IDs before downstream work', async () => {
 expect((await POST(request({ question: 'Question?' }), { params: Promise.resolve({ id: artistId, jobId: 'invalid' }) })).status).toBe(400);
 expect(handleArtistQuestion).not.toHaveBeenCalled();
});
it('rejects malformed or oversized request bodies', async () => {
 for (const body of ['{', JSON.stringify({ question: 'x'.repeat(18001) })]) {
  const response = await POST(new Request('https://web.example/result', { method: 'POST', body }), context);
  expect(response.status).toBe(400);
 }
 expect(handleArtistQuestion).not.toHaveBeenCalled();
});

/** @jest-environment node */
import { db } from '@/server/db/drizzle';
import { listReusableQuestionCandidates } from '../listReusableQuestionCandidates';

jest.mock('@/server/db/drizzle', () => ({ db: { execute: jest.fn() } }));
const execute = jest.mocked(db.execute);
const refs = Array.from({ length: 6 }, (_, i) => ({
  sourceId: `vault:${String(i + 1).repeat(8)}-1111-4111-8111-111111111111`,
  revision: 'a'.repeat(64), start: 0, end: 12, text: 'Source text.',
  url: `https://artist.example/${i + 1}`, curation: 'approved',
  evidenceKind: 'original_text', speaker: 'unverified', publishedAt: null,
  retrievedAt: null, truncated: false,
}));
const row = {
  job_id: '22222222-2222-4222-8222-222222222222', question_hash: 'a'.repeat(64),
  answer_intent: 'What instruments did they play?', routing: {},
  answer: 'They played instruments. [4, 6]', refs, sources: refs.map((ref, i) => ({ n: i + 1, sourceId: ref.sourceId })),
};
beforeEach(() => jest.resetAllMocks());
it('keeps all allowed public evidence when considering a six-source saved answer for reuse', async () => {
  execute.mockResolvedValueOnce([row] as never);
  const candidates = await listReusableQuestionCandidates('11111111-1111-4111-8111-111111111111');
  expect(candidates).toHaveLength(1);
  expect(candidates[0].passages.map(p => p.url)).toEqual(refs.map(ref => ref.url));
});
it('still rejects candidates with more than six sources', async () => {
  execute.mockResolvedValueOnce([{ ...row, sources: [...row.sources, row.sources[0]] }] as never);
  expect(await listReusableQuestionCandidates('11111111-1111-4111-8111-111111111111')).toEqual([]);
});

it('keeps server continuation state out of semantic planner candidates',async()=>{
 execute.mockResolvedValueOnce([{...row,routing:{topic:'Influences',reuseFallbackJobId:row.job_id}}] as never);
 expect((await listReusableQuestionCandidates('11111111-1111-4111-8111-111111111111'))[0].routing).toEqual({topic:'Influences'});
});

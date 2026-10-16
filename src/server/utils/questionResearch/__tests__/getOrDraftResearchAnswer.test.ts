/** @jest-environment node */
import { PgDialect } from "drizzle-orm/pg-core";
import type { PGlite as PGliteClient } from "@electric-sql/pglite";
import type { SQL } from "drizzle-orm";
import { getResearchQuestionHash } from "@/lib/questionResearch/getResearchQuestionHash";
import { createHash } from "node:crypto";
import { db } from "@/server/db/drizzle";
import { draftResearchAnswer } from "../draftResearchAnswer";
import { getOrDraftResearchAnswer } from "../getOrDraftResearchAnswer";

// Load WASM outside Jest's VM, as in the existing request-reuse integration suite.
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');

jest.mock("@/server/db/drizzle", () => ({ db: { execute: jest.fn() } }));
jest.mock("../draftResearchAnswer", () => ({ draftResearchAnswer: jest.fn() }));
const execute = jest.mocked(db.execute);
const draft = jest.mocked(draftResearchAnswer);
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const ref = {
  sourceId: "vault:33333333-3333-4333-8333-333333333333",
  revision: "a".repeat(64), start: 10, end: 27,
  text: "I played the drums", url: "https://artist.example/interview",
  curation: "approved" as const, evidenceKind: "original_text" as const,
  speaker: "unverified" as const, publishedAt: null, retrievedAt: null, truncated: false,
};
const source = {
  n: 1, title: "artist.example", url: ref.url, sourceId: ref.sourceId,
  revision: ref.revision, start: 0, end: 50, curation: ref.curation,
  evidenceKind: ref.evidenceKind,
};
const result = {
  answer: "They played the drums. [1]", sources: [source],
  instagramMentions: [], fromOpenWeb: false, webDomains: [], suggestions: [],
};
const input = {
  artistId: "11111111-1111-4111-8111-111111111111",
  artistName: "Artist", jobId: "22222222-2222-4222-8222-222222222222",
  question: "Who played drums?", references: [ref],
};
const saved = {
  ...result,
  basis: [{ sourceId: ref.sourceId, revision: ref.revision,
    start: ref.start, end: ref.end, url: ref.url, textHash: hash(ref.text), publishedAt: ref.publishedAt }],
};
beforeEach(() => { jest.resetAllMocks(); draft.mockResolvedValue(result); });
it("saves the first checked answer and returns it unchanged on a later poll", async () => {
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, question_hash: getResearchQuestionHash(input.question), status: "waiting", claim_until: new Date(0).toISOString(), attempts: 0 }] as never)
    .mockResolvedValueOnce([{ claim_token: "token" }] as never)
    .mockResolvedValueOnce([{ job_id: input.jobId }] as never);
  expect(await getOrDraftResearchAnswer(input)).toEqual({ state: "ready", result });
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, question_hash: getResearchQuestionHash(input.question), status: "verified", result: saved }] as never);
  expect(await getOrDraftResearchAnswer(input)).toEqual({ state: "ready", result });
  expect(draft).toHaveBeenCalledTimes(1);
});
it("does not launch another draft while a concurrent poller owns the lease", async () => {
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, question_hash: getResearchQuestionHash(input.question), status: "drafting", claim_until: new Date(Date.now() + 60_000).toISOString(), attempts: 1 }] as never);
  expect(await getOrDraftResearchAnswer(input)).toEqual({ state: "drafting" });
  expect(draft).not.toHaveBeenCalled();
});
it("withholds a cached answer if the API no longer considers its original eligible", async () => {
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, question_hash: getResearchQuestionHash(input.question), status: "verified", result: saved }] as never);
  expect(await getOrDraftResearchAnswer({ ...input, references: [] })).toEqual({ state: "unavailable" });
  expect(draft).not.toHaveBeenCalled();
});
it("records a safe draft failure without returning or replacing a verified answer", async () => {
  draft.mockRejectedValue(Object.assign(new Error("private model details"), { verificationStage: "claim_check" }));
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, question_hash: getResearchQuestionHash(input.question), status: "waiting", claim_until: new Date(0).toISOString(), attempts: 0 }] as never)
    .mockResolvedValueOnce([{ claim_token: "token" }] as never)
    .mockResolvedValueOnce([] as never);
  expect(await getOrDraftResearchAnswer(input)).toEqual({ state: "failed", stage: "claim_check", retryable: true });
  expect(draft).toHaveBeenCalledTimes(1);
});
it("rejects an unregistered question before any model call", async () => {
  execute.mockResolvedValueOnce([] as never).mockResolvedValueOnce([] as never);
  expect(await getOrDraftResearchAnswer({ ...input, question: "A different question?" })).toEqual({ state: "unregistered" });
  expect(draft).not.toHaveBeenCalled();
});
it("keeps citation 2 attached to its exact passage when one source has two windows", async () => {
  const second = { ...ref, start: 50, end: 68, text: "I finished the song" };
  const cited = { ...source, n: 2 };
  draft.mockResolvedValue({ ...result, sources: [cited] });
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, question_hash: getResearchQuestionHash(input.question), status: "waiting", claim_until: new Date(0).toISOString(), attempts: 0 }] as never)
    .mockResolvedValueOnce([{ claim_token: "token" }] as never)
    .mockResolvedValueOnce([{ job_id: input.jobId }] as never);
  expect((await getOrDraftResearchAnswer({ ...input, references: [ref, second] })).state).toBe("ready");
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, question_hash: getResearchQuestionHash(input.question), status: "verified", result: {
      ...result, sources: [cited], basis: [{ sourceId: second.sourceId, revision: second.revision,
        start: second.start, end: second.end, url: second.url, textHash: hash(second.text), publishedAt: second.publishedAt }],
    } }] as never);
  expect((await getOrDraftResearchAnswer({ ...input, references: [second, ref] })).state).toBe("ready");
  expect(draft).toHaveBeenCalledTimes(1);
});
it("withholds an old cached answer whose publication-date basis was not recorded", async () => {
  const legacy = { ...saved, basis: saved.basis.map(({ publishedAt: _date, ...b }) => b) };
  execute.mockResolvedValueOnce([] as never).mockResolvedValueOnce([{ artist_id: input.artistId, question_hash: getResearchQuestionHash(input.question), status: "verified", result: legacy }] as never);
  expect(await getOrDraftResearchAnswer(input)).toEqual({ state: "unavailable" });
  expect(draft).not.toHaveBeenCalled();
});
it("withholds a cached answer when date metadata changes without changing original text", async () => {
  execute.mockResolvedValueOnce([] as never).mockResolvedValueOnce([{ artist_id: input.artistId, question_hash: getResearchQuestionHash(input.question), status: "verified", result: { ...saved, basis: saved.basis.map(b => ({ ...b, publishedAt: "2026-10-05" })) } }] as never);
  expect(await getOrDraftResearchAnswer({ ...input, references: [{ ...ref, publishedAt: "2026-10-06" }] })).toEqual({ state: "unavailable" });
  expect(draft).not.toHaveBeenCalled();
});

it("stops polling when the final drafting lease expired without a recorded outcome", async () => {
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, question_hash: getResearchQuestionHash(input.question), status: "drafting", claim_until: new Date(0).toISOString(), attempts: 3 }] as never)
    .mockResolvedValueOnce([] as never);
  expect(await getOrDraftResearchAnswer(input)).toEqual({ state: "failed", stage: "draft", retryable: false });
  expect(draft).not.toHaveBeenCalled();
  expect(execute).toHaveBeenCalledTimes(2);
});
it("keeps waiting for the live final drafting lease without spending another attempt", async () => {
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, question_hash: getResearchQuestionHash(input.question), status: "drafting", claim_until: new Date(Date.now() + 60000).toISOString(), attempts: 3 }] as never);
  expect(await getOrDraftResearchAnswer(input)).toEqual({ state: "drafting" });
  expect(draft).not.toHaveBeenCalled();
});
it('selects the existing legacy registration and keeps its hash for lease and verified writes', async () => {
  const legacy = hash(input.question);
  const dialect = new PgDialect();
  const queries: ReturnType<PgDialect['sqlToQuery']>[] = [];
  execute.mockImplementation((async (query: Parameters<typeof db.execute>[0]) => {
    const compiled = dialect.sqlToQuery(query as SQL);
    queries.push(compiled);
    if (compiled.sql.includes('select artist_id')) {
      expect(compiled.params).toContain(legacy);
      expect(compiled.params).toContain(getResearchQuestionHash(input.question));
      expect(compiled.sql).toMatch(/order by.*question_hash.*desc\s+limit 1/i);
      return [{artist_id:input.artistId,question_hash:legacy,status:'waiting',claim_until:new Date(0).toISOString(),attempts:2}] as never;
    }
    if (compiled.sql.includes("set status='drafting'")) return [{claim_token:'token'}] as never;
    if (compiled.sql.includes("set status='verified'")) return [{job_id:input.jobId}] as never;
    return [] as never;
  }) as never);
  expect((await getOrDraftResearchAnswer(input)).state).toBe('ready');
  const writes = queries.filter(q=>/update artist_question_answers/.test(q.sql));
  expect(writes).toHaveLength(2);
  for (const query of writes) {
    expect(query.params).toContain(legacy);
    expect(query.params).not.toContain(getResearchQuestionHash(input.question));
  }
  expect(queries.some(q=>/insert into/i.test(q.sql))).toBe(false);
});
it('does not reset an exhausted legacy registration',async()=>{
 execute.mockResolvedValueOnce([] as never).mockResolvedValueOnce([{artist_id:input.artistId,question_hash:hash(input.question),status:'failed',claim_until:new Date(0).toISOString(),attempts:3,failure_stage:'claim_check'}] as never);
 expect(await getOrDraftResearchAnswer(input)).toEqual({state:'failed',stage:'claim_check',retryable:false});expect(draft).not.toHaveBeenCalled();expect(execute).toHaveBeenCalledTimes(2);
});
it('can replay a verified legacy registration only while its originals remain eligible',async()=>{
 execute.mockResolvedValueOnce([] as never).mockResolvedValueOnce([{artist_id:input.artistId,question_hash:hash(input.question),status:'verified',result:saved}] as never);
 expect(await getOrDraftResearchAnswer(input)).toEqual({state:'ready',result});expect(draft).not.toHaveBeenCalled();
});
it('read-only lookup cannot draft or strand an abandoned waiting answer',async()=>{
 execute.mockResolvedValueOnce([] as never).mockResolvedValueOnce([{question_hash:'a'.repeat(64),status:'waiting',attempts:0,claim_until:new Date(0).toISOString()}] as never);
 expect(await getOrDraftResearchAnswer({...input,readOnlyQuestionHash:'a'.repeat(64)})).toEqual({state:'unavailable'});
 expect(draft).not.toHaveBeenCalled();
 expect(execute).toHaveBeenCalledTimes(2);
});


it("saves and reopens a six-source answer without dropping citations four through six", async () => {
  const refs = Array.from({ length: 6 }, (_, i) => ({ ...ref, sourceId: `vault:${String(i + 1).repeat(8)}-1111-4111-8111-111111111111`, url: `https://artist.example/credits/${i + 1}` }));
  const sixResult = { ...result, answer: "They played drums. [1, 2, 3, 4, 5, 6]", sources: refs.map((r, i) => ({ ...source, n: i + 1, sourceId: r.sourceId, url: r.url })) };
  draft.mockResolvedValue(sixResult);
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, question_hash: getResearchQuestionHash(input.question), status: "waiting", claim_until: new Date(0).toISOString(), attempts: 0 }] as never)
    .mockResolvedValueOnce([{ claim_token: "token" }] as never)
    .mockResolvedValueOnce([{ job_id: input.jobId }] as never);
  expect(await getOrDraftResearchAnswer({ ...input, references: refs })).toEqual({ state: "ready", result: sixResult });
  const query = new PgDialect().sqlToQuery(execute.mock.calls[3][0] as SQL);
  const stored = query.params.find((value): value is string => typeof value === "string" && value.includes('"basis"'));
  expect(stored).toBeDefined();
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, question_hash: getResearchQuestionHash(input.question), status: "verified", result: JSON.parse(stored!) }] as never);
  expect(await getOrDraftResearchAnswer({ ...input, references: refs })).toEqual({ state: "ready", result: sixResult });
  expect(draft).toHaveBeenCalledTimes(1);
});

it("rejects a blank cached answer instead of returning ready with no visible content", async () => {
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, question_hash: getResearchQuestionHash(input.question), status: "verified", result: { ...saved, answer: "   " } }] as never);
  expect(await getOrDraftResearchAnswer(input)).toEqual({ state: "unavailable" });
  expect(draft).not.toHaveBeenCalled();
});

it('keeps a recently acknowledged question in its existing answer lane before the browser resumes it',async()=>{
 execute.mockResolvedValueOnce([] as never).mockResolvedValueOnce([{question_hash:'a'.repeat(64),status:'waiting',attempts:0,claim_until:new Date().toISOString()}] as never);
 expect(await getOrDraftResearchAnswer({...input,readOnlyQuestionHash:'a'.repeat(64)})).toEqual({state:'drafting'});
 expect(draft).not.toHaveBeenCalled();expect(execute).toHaveBeenCalledTimes(2);
});

it('persists stable citation 1 and 3 bases when a duplicate original 2 is omitted', async () => {
  const third = { ...ref, sourceId: 'vault:44444444-4444-4444-8444-444444444444', url: 'https://artist.example/second', text: 'I wrote the song', start: 0, end: 16 };
  const selected = [ref, { ...ref }, third];
  const cited = [source, { ...source, n: 3, sourceId: third.sourceId, url: third.url }];
  const checked = { ...result, answer: 'They played drums and wrote the song. [1, 3]', sources: cited };
  draft.mockResolvedValue(checked);
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, question_hash: getResearchQuestionHash(input.question), status: 'waiting', claim_until: new Date(0).toISOString(), attempts: 0 }] as never)
    .mockResolvedValueOnce([{ claim_token: 'token' }] as never)
    .mockResolvedValueOnce([{ job_id: input.jobId }] as never);
  expect(await getOrDraftResearchAnswer({ ...input, references: selected })).toEqual({ state: 'ready', result: checked });
  const query = new PgDialect().sqlToQuery(execute.mock.calls[3][0] as SQL);
  const stored = JSON.parse(query.params.find((p): p is string => typeof p === 'string' && p.includes('"basis"'))!);
  expect(stored.basis.map((b: {sourceId:string,textHash:string}) => [b.sourceId,b.textHash])).toEqual([[ref.sourceId,hash(ref.text)],[third.sourceId,hash(third.text)]]);
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, question_hash: getResearchQuestionHash(input.question), status: 'verified', result: stored }] as never);
  expect(await getOrDraftResearchAnswer({ ...input, references: selected })).toEqual({ state: 'ready', result: checked });
  expect(draft).toHaveBeenCalledTimes(1);
});

it.each(['verified', 'drafting'])("resumes a marked candidate continuation before returning a %s answer or spending another attempt", async status => {
  execute.mockResolvedValueOnce([] as never).mockResolvedValueOnce([{
    artist_id: input.artistId, question_hash: getResearchQuestionHash(input.question),
    status, result: { ...saved, sources: [], basis: [] },
    claim_until: new Date(0).toISOString(), attempts: 3,
    failure_stage: 'candidate_continuation',
  }] as never);
  expect(await getOrDraftResearchAnswer(input)).toEqual({ state: 'continuing' });
  expect(draft).not.toHaveBeenCalled();
  expect(execute).toHaveBeenCalledTimes(2);
});

async function withAnswerDatabase(
  selection: 'candidates' | 'research' | undefined,
  run: (store: PGliteClient) => Promise<void>,
) {
  const store = new PGlite();
  try {
    await store.exec(`
      create table artist_research_jobs (
        id uuid primary key, artist_id uuid not null, kind text not null,
        status text not null, state jsonb not null
      );
      create table artist_question_answers (
        job_id uuid not null, artist_id uuid not null, question_hash text not null,
        status text not null, claim_token uuid not null, claim_until timestamptz not null,
        attempts integer not null check (attempts between 0 and 3),
        result jsonb, failure_stage text, expires_at timestamptz not null,
        updated_at timestamptz not null default now(),
        primary key (job_id,question_hash),
        check ((status='verified' and jsonb_typeof(result)='object') or
          (status<>'verified' and result is null))
      );
    `);
    await store.query(`insert into artist_research_jobs values ($1,$2,'question_research','done',$3::jsonb)`,
      [input.jobId, input.artistId, JSON.stringify({ stage: 'complete', ...(selection ? { selection } : {}) })]);
    await store.query(`insert into artist_question_answers
      (job_id,artist_id,question_hash,status,claim_token,claim_until,attempts,expires_at)
      values ($1,$2,$3,'waiting','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',now(),1,now()+interval '24 hours')`,
      [input.jobId, input.artistId, getResearchQuestionHash(input.question)]);
    const dialect = new PgDialect();
    execute.mockImplementation((async (query: Parameters<typeof db.execute>[0]) => {
      const compiled = dialect.sqlToQuery(query as SQL);
      return (await store.query(compiled.sql, compiled.params)).rows;
    }) as never);
    await run(store);
  } finally {
    await store.close();
  }
}

it.each([undefined, 'candidates'] as const)("does not lease stale %s references after the same job completed research", async selection => {
  await withAnswerDatabase('research', async store => {
    expect(await getOrDraftResearchAnswer({ ...input, selection })).toEqual({ state: 'drafting' });
    expect(draft).not.toHaveBeenCalled();
    expect((await store.query('select status,attempts,result from artist_question_answers')).rows)
      .toEqual([{ status: 'waiting', attempts: 1, result: null }]);
  });
});

it.each(['pending', 'running'])("does not lease an answer while the research job is %s", async status => {
  await withAnswerDatabase('research', async store => {
    await store.query('update artist_research_jobs set status=$1', [status]);
    expect(await getOrDraftResearchAnswer({ ...input, selection: 'research' })).toEqual({ state: 'drafting' });
    expect(draft).not.toHaveBeenCalled();
    expect((await store.query('select attempts from artist_question_answers')).rows).toEqual([{ attempts: 1 }]);
  });
});

it.each(['pending', 'done'])("does not publish a candidate draft if continuation changed the job during the model call (research %s)", async status => {
  await withAnswerDatabase('candidates', async store => {
    draft.mockImplementationOnce(async () => {
      await store.query('update artist_research_jobs set status=$1,state=$2::jsonb',
        [status, JSON.stringify({ stage: status === 'done' ? 'complete' : 'checking_saved', selection: 'research' })]);
      return result;
    });
    expect(await getOrDraftResearchAnswer({ ...input, selection: 'candidates' })).toEqual({ state: 'drafting' });
    expect(draft).toHaveBeenCalledTimes(1);
    expect((await store.query('select status,attempts,result from artist_question_answers')).rows)
      .toEqual([{ status: 'drafting', attempts: 2, result: null }]);
  });
});

it.each([undefined, 'candidates', 'research'] as const)("retains the registered expiry and attempt count while drafting in matching phase %s", async selection => {
  await withAnswerDatabase(selection, async store => {
    const before = (await store.query<{ expires_at: string; question_hash: string }>('select expires_at::text,question_hash from artist_question_answers')).rows[0];
    expect(await getOrDraftResearchAnswer({ ...input, selection })).toEqual({ state: 'ready', result });
    const after = (await store.query('select expires_at::text,question_hash,attempts,status from artist_question_answers')).rows[0];
    expect(after).toEqual({ ...before, attempts: 2, status: 'verified' });
    expect(draft).toHaveBeenCalledTimes(1);
  });
});

it('does not wait forever when continuation retained an exhausted answer budget', async () => {
  execute.mockResolvedValueOnce([] as never).mockResolvedValueOnce([{ question_hash:getResearchQuestionHash(input.question), status:'waiting', attempts:3, claim_until:new Date(0).toISOString() }] as never);
  expect(await getOrDraftResearchAnswer({...input,selection:'research'})).toEqual({state:'failed',stage:'draft',retryable:false});
  expect(draft).not.toHaveBeenCalled();
});

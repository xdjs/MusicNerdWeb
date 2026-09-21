import test from 'node:test';
import assert from 'node:assert/strict';
import { runRelease } from './runRelease.mjs';

const sha = 'a'.repeat(40);
function harness(options = {}) {
  const env = { GITHUB_SHA: sha, GITHUB_REPOSITORY: 'xdjs/MusicNerdWeb',
    GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'push', GITHUB_RUN_ID: '123',
    GITHUB_RUN_ATTEMPT: '1', VERCEL_PROJECT_ID: 'prj_test', VERCEL_ORG_ID: 'team_test',
    VERCEL_TOKEN: 'private-token', GH_TOKEN: 'github-private-token',
    VERCEL_AUTOMATION_BYPASS_SECRET: 'private-bypass', RELEASE_ENVIRONMENT: 'staging', ...options.env };
  const records = [], calls = [];
  let created = false, promoted = false, assigned = false, mainCalls = 0, aliasCalls = 0;
  const stage = { id: 'dpl_stage', url: 'music-nerd-stage.vercel.app', projectId: 'prj_test',
    gitSource: { sha }, readyState: 'READY', customEnvironment: { id: 'env_stage' }, target: null };
  const candidate = { ...stage, id: 'dpl_candidate', url: 'music-nerd-candidate.vercel.app',
    ...(env.RELEASE_ENVIRONMENT === 'production' ? { target: 'production', customEnvironment: undefined } : {}),
    ...options.deployment };
  env.STAGING_RECORD = JSON.stringify({ sha, id: stage.id, url: `https://${stage.url}`,
    environment: 'staging', phase: 'assigned', runId: '123', ...options.stagingRecord });
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
  const fetchFn = async (url, init) => {
    const parsed = new URL(url);
    calls.push({ url, ...init, body: init.body ? JSON.parse(init.body) : undefined });
    if (options.failure?.(parsed, init)) return new Response('provider secret material', { status: 403 });
    if (parsed.hostname === 'api.github.com') {
      mainCalls++;
      return json({ object: { sha: options.staleAt && mainCalls >= options.staleAt ? 'b'.repeat(40) : sha } });
    }
    if (parsed.pathname === '/v9/projects/prj_test') return json({ id: 'prj_test',
      autoAssignCustomDomains: options.autoAssign ?? false,
      customEnvironments: [{ id: 'env_stage', slug: 'staging', domains: [{ name: 'staging.musicnerd.xyz' }], ...options.custom }],
      targets: { production: { id: promoted || options.earlyPromotion && created ? candidate.id : 'dpl_old' } } });
    if (parsed.pathname === '/v13/deployments' && init.method === 'POST') { created = true; return json(candidate); }
    if (parsed.pathname === '/v13/deployments/dpl_stage') return json({ ...stage, ...options.stagedDeployment });
    if (parsed.pathname === '/v13/deployments/dpl_candidate') return json(candidate);
    if (parsed.hostname.endsWith('.vercel.app')) {
      if (parsed.pathname === '/api/health') return json({ ok: !options.unhealthy,
        checks: { database: !options.unhealthy, storage: true } });
      return new Response(options.home || '<html>Music Nerd</html>', { headers: { 'content-type': 'text/html' } });
    }
    if (parsed.pathname === '/v10/projects/prj_test/promote/dpl_candidate') { promoted = true; return json({}); }
    if (parsed.pathname === '/v2/deployments/dpl_candidate/aliases') { assigned = true; return json({}); }
    if (parsed.pathname === '/v4/aliases/staging.musicnerd.xyz') {
      aliasCalls++;
      return json({ deploymentId: created && aliasCalls > (options.aliasDelay || 0) ? candidate.id : 'dpl_old' });
    }
    throw new Error(`Unexpected test request: ${parsed.pathname}`);
  };
  return { env, calls, records, run: () => runRelease({ env, fetchFn,
    sleep: async () => {}, record: value => records.push(structuredClone(value)) }) };
}
const mutations = h => h.calls.filter(call => call.method === 'POST');

test('staging builds exact SHA, checks immutable URL and verifies staging alias, records evidence', async () => {
  const h = harness(); const result = await h.run();
  assert.equal(result.sha, sha); assert.equal(result.phase, 'assigned');
  assert.deepEqual(h.records.map(r => r.phase), ['created', 'validated', 'assigned']);
  const writes = mutations(h);
  assert.deepEqual(writes[0].body.gitSource, { type: 'github', org: 'xdjs', repo: 'MusicNerdWeb', ref: sha, sha });
  assert.equal(writes[0].body.customEnvironmentSlugOrId, 'env_stage');
  assert.equal(writes[0].body.target, undefined);
  assert.equal(writes.length, 1);
  assert(h.calls.findIndex(c => c.url.includes('/api/health')) < h.calls.findIndex(c => c.url.includes('/v4/aliases/')));
  assert(!JSON.stringify(h.records).includes('private'));
  for (const call of h.calls.filter(c => c.headers['x-vercel-protection-bypass'])) {
    assert(new URL(call.url).hostname.endsWith('.vercel.app')); assert.equal(call.redirect, 'error');
  }
});

test('production revalidates staged deployment and builds separate production candidate before promotion', async () => {
  const h = harness({ env: { RELEASE_ENVIRONMENT: 'production' } }); await h.run();
  const writes = mutations(h); assert.equal(writes.length, 2);
  assert.equal(writes[0].body.target, 'production');
  assert.equal(writes[0].body.customEnvironmentSlugOrId, undefined);
  assert.equal(writes[0].body.deploymentId, undefined);
  assert(writes[1].url.includes('/promote/dpl_candidate'));
  assert(h.calls.findIndex(c => c.url.includes('music-nerd-stage.vercel.app/api/health')) < h.calls.indexOf(writes[0]));
  assert(h.calls.findIndex(c => c.url.includes('music-nerd-candidate.vercel.app/api/health')) < h.calls.indexOf(writes[1]));
});

for (const [name, options, message, maximumWrites] of [
  ['PR context', { env: { GITHUB_EVENT_NAME: 'pull_request' } }, /Invalid release context/, 0],
  ['non-main ref', { env: { GITHUB_REF: 'refs/heads/topic' } }, /Invalid release context/, 0],
  ['auto promotion enabled', { autoAssign: true }, /must be disabled/, 0],
  ['custom staging tracks branch', { custom: { branchMatcher: { pattern: 'main' } } }, /no branch tracking/, 0],
  ['staging has wrong domain', { custom: { domains: [{ name: 'www.musicnerd.xyz' }] } }, /only its staging domain/, 0],
  ['stale queued run', { staleAt: 1 }, /Stale release/, 0],
  ['main advances during build', { staleAt: 3 }, /Stale release/, 1],
  ['wrong SHA returned', { deployment: { gitSource: { sha: 'b'.repeat(40) } } }, /identity or state/, 1],
  ['wrong project returned', { deployment: { projectId: 'prj_other' } }, /identity or state/, 1],
  ['wrong staging environment', { deployment: { customEnvironment: { id: 'env_other' } } }, /environment mismatch/, 1],
  ['failed remote build', { deployment: { readyState: 'ERROR' } }, /Deployment ERROR/, 1],
  ['timeout does not publish', { deployment: { readyState: 'BUILDING' } }, /identity or state/, 1],
  ['health fails', { unhealthy: true }, /health check failed/, 1],
  ['homepage not HTML', { home: 'login required' }, /HTML check failed/, 1],
  ['foreign immutable host', { deployment: { url: 'attacker.example' } }, /Invalid created/, 1],
  ['provider body stays private', { failure: p => p.pathname.includes('/v9/projects/') }, /HTTP 403/, 0],
]) test(name, async () => {
  const h = harness(options);
  await assert.rejects(h.run(), error => message.test(error.message) && !error.message.includes('secret material'));
  assert(mutations(h).length <= maximumWrites);
  assert(!h.records.some(r => r.phase === 'assigned'));
});

for (const [name, options, message, maximumWrites] of [
  ['different run evidence', { stagingRecord: { runId: '456' } }, /evidence does not match/, 0],
  ['unvalidated staging evidence', { stagingRecord: { phase: 'created' } }, /evidence does not match/, 0],
  ['staged SHA changed', { stagedDeployment: { gitSource: { sha: 'b'.repeat(40) } } }, /identity or state/, 0],
  ['wrong production target', { deployment: { target: null } }, /environment mismatch/, 1],
  ['early promotion detected', { earlyPromotion: true }, /unexpectedly promoted/, 1],
  ['stale approval', { staleAt: 1 }, /Stale release/, 0],
]) test(name, async () => {
  const h = harness({ ...options, env: { RELEASE_ENVIRONMENT: 'production' } });
  await assert.rejects(h.run(), message); assert(mutations(h).length <= maximumWrites);
});

test('accepts the documented nested project representation', async () => {
  const h = harness({ deployment: { projectId: undefined, project: { id: 'prj_test' } } });
  assert.equal((await h.run()).phase, 'assigned');
});

test('waits for staging domain to reach the validated deployment', async () => {
  const h = harness({ aliasDelay: 2 });
  assert.equal((await h.run()).phase, 'assigned');
  assert.equal(h.calls.filter(c => c.url.includes('/v4/aliases/')).length, 3);
});

test('fails closed when staging domain never reaches the deployment', async () => {
  const h = harness({ aliasDelay: Infinity });
  await assert.rejects(h.run(), /Staging alias assignment did not complete/);
  assert.equal(h.calls.filter(c => c.url.includes('/v4/aliases/')).length, 30);
  assert(!h.records.some(r => r.phase === 'assigned'));
});

test('fails immediately on terminal staging alias error', async () => {
  const h = harness({ aliasDelay: Infinity, deployment: { aliasError: { code: 'error', message: 'private' } } });
  await assert.rejects(h.run(), /Staging alias assignment failed/);
  assert(!h.records.some(r => r.phase === 'assigned'));
});

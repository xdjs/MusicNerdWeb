import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runPreflight } from './runPreflight.mjs';

const sha = 'a'.repeat(40);
const stageRef = 's'.repeat(20), prodRef = 'p'.repeat(20);
test('workflow masks private resource inputs and gates access to manual main with releases disabled', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/release-preflight.yml', import.meta.url), 'utf8');
  for (const name of ['STAGING_SUPABASE_PROJECT_REF', 'PRODUCTION_SUPABASE_PROJECT_REF', 'VERCEL_TOKEN']) {
    assert.ok(workflow.includes(`${name}: \${{ secrets.${name} }}`));
    assert.ok(!workflow.includes(`vars.${name}`));
  }
  assert.match(workflow, /environment: staging-release/);
  assert.match(workflow, /if: github.ref == 'refs\/heads\/main' && github.event_name == 'workflow_dispatch' && vars.RELEASES_ENABLED == 'false'/);
});
function harness(options = {}) {
  const calls = [], reports = [];
  const env = { GITHUB_SHA: sha, GITHUB_REF: 'refs/heads/main',
    GITHUB_REPOSITORY: 'xdjs/MusicNerdWeb', GITHUB_EVENT_NAME: 'workflow_dispatch',
    RELEASES_ENABLED: 'false', GH_TOKEN: 'github-secret', VERCEL_TOKEN: 'vercel-secret',
    VERCEL_PROJECT_ID: 'prj_test', VERCEL_ORG_ID: 'team_test',
    STAGING_SUPABASE_PROJECT_REF: stageRef, PRODUCTION_SUPABASE_PROJECT_REF: prodRef, ...options.env };
  const fetchFn = async (url, init) => {
    calls.push({ url, ...init });
    const u = new URL(url), p = u.pathname;
    if (options.networkError) throw new Error('private response containing vercel-secret');
    let body;
    if (u.hostname === 'api.github.com') body = { object: { sha: options.stale ? 'b'.repeat(40) : sha } };
    else if (p === '/v9/projects/prj_test') body = { id: 'prj_test', autoAssignCustomDomains: false, autoExposeSystemEnvs: true, buildCommand: null,
      customEnvironments: [{ id: 'env_stage', slug: 'staging', ...options.custom }] };
    else if (p === '/v9/projects/prj_test/domains') body = { domains: options.domains || [{ name: 'staging.musicnerd.xyz', customEnvironmentId: 'env_stage' }], pagination: options.pagination };
    else if (p.startsWith('/v4/aliases/')) body = { deploymentId: p.includes('staging.') ? 'dpl_stage' : 'dpl_prod', ...options.alias };
    else if (p.startsWith('/v13/deployments/')) body = { id: p.split('/').at(-1), projectId: 'prj_test',
      readyState: 'READY', gitSource: options.omitDefaultGitSource && !u.searchParams.has('withGitRepoInfo') ? undefined :
        { sha: p.endsWith('dpl_prod') ? options.productionSha || sha : sha },
      meta: { githubCommitSha: p.endsWith('dpl_prod') ? options.productionSha || sha : sha },
      ...(p.endsWith('dpl_stage') ? { customEnvironment: { id: 'env_stage' } } : { target: 'production' }), ...options.deployment };
    else if (p === '/v10/projects/prj_test/env') body = { envs: [
      { id: 'env_stage_url', key: 'SUPABASE_URL', customEnvironmentIds: ['env_stage'] },
      { id: 'env_stage_key', key: 'SUPABASE_SERVICE_ROLE_KEY', customEnvironmentIds: ['env_stage'] },
      { id: 'env_prod_url', key: 'SUPABASE_URL', target: ['production'] },
      { id: 'env_prod_key', key: 'SUPABASE_SERVICE_ROLE_KEY', target: ['production'] },
      { id: 'hash_stage', key: 'RELEASE_SUPABASE_URL_SHA256', customEnvironmentIds: ['env_stage'] },
      { id: 'hash_prod', key: 'RELEASE_SUPABASE_URL_SHA256', target: ['production'] }, ...(options.extraEnvs || []) ] };
    else if (p.startsWith('/v1/projects/prj_test/env/hash_')) body = options.writeOnly ? { decrypted: false } : {
      value: options.wrongHash ? '0'.repeat(64) : createHash('sha256').update(
        `https://${p.endsWith('hash_stage') ? stageRef : prodRef}.supabase.co`).digest('hex') };
    else throw new Error('Unexpected request');
    return new Response(JSON.stringify(body), { status: options.status || 200 });
  };
  return { calls, reports, run: () => runPreflight({ env, fetchFn, record: r => reports.push(r) }) };
}
test('uses GET only, validates expected hashes, and never requests write-only storage values', async () => {
  const h = harness(); const r = await h.run();
  assert.equal(r.ok, true);
  assert.ok(h.calls.every(c => c.method === 'GET' && c.redirect === 'error'));
  const storage = h.calls.filter(c => c.url.includes('supabase.co'));
  assert.equal(storage.length, 0);
  assert.ok(!h.calls.some(c => /\/v1\/projects.*\/env\/env_/.test(c.url)));
  assert.deepEqual(r.pending, ['staging-build-storage-validation', 'production-build-storage-identity']);
  assert.ok(h.calls.some(c => c.url.includes('withGitRepoInfo=true')));
  for (const secret of ['vercel-secret','github-secret','storage-secret',stageRef,prodRef])
    assert.ok(!JSON.stringify(h.reports).includes(secret));
});
for (const env of [{ GITHUB_REF: 'refs/heads/feature' }, { GITHUB_EVENT_NAME: 'push' },
  { RELEASES_ENABLED: 'true' }, { GITHUB_REPOSITORY: 'other/repo' },
  { STAGING_SUPABASE_PROJECT_REF: prodRef }, { STAGING_SUPABASE_PROJECT_REF: 'evil.invalid/path' }]) {
  test(`rejects invalid context without network: ${JSON.stringify(env)}`, async () => {
    const h = harness({ env }); assert.equal((await h.run()).ok, false); assert.equal(h.calls.length, 0);
  });
}
test('rejects stale main before accessing Vercel', async () => {
  const h = harness({ stale: true }); assert.equal((await h.run()).ok, false);
  assert.ok(h.calls.every(c => c.url.startsWith('https://api.github.com/')));
});
test('reports missing default gitSource separately from enriched response', async () => {
  const h = harness({ omitDefaultGitSource: true }); const r = await h.run();
  assert.equal(r.checks.stagingDefaultGitSource, false);
  assert.equal(r.checks.stagingEnrichedGitSource, true);
  assert.equal(r.checks.stagingExpectedStorageHash, true);
  assert.equal(r.ok, false);
});
test('accepts different existing staging and production SHAs', async () => {
  const h = harness({ productionSha: 'b'.repeat(40) }); const r = await h.run();
  assert.equal(r.ok, true); assert.equal(r.deployments.staging.sha, sha);
  assert.equal(r.deployments.production.sha, 'b'.repeat(40));
});
test('rejects deployments from another project without exposing their metadata', async () => {
  const h = harness({ deployment: { projectId: 'prj_other' } }); const r = await h.run();
  assert.equal(r.ok, false); assert.deepEqual(r.deployments, {});
});
test('rejects ambiguous staging configuration', async () => {
  const h = harness({ extraEnvs: [{ id: 'duplicate', key: 'SUPABASE_URL', customEnvironmentIds: ['env_stage'] }] });
  assert.equal((await h.run()).ok, false);
});
for (const options of [{ wrongHash: true }, { writeOnly: true }]) test('requires readable, independently matching expected hashes', async () => {
  const h = harness(options); const r = await h.run();
  assert.equal(r.ok, false); assert.equal(r.checks.stagingExpectedStorageHash, false);
});
for (const options of [{ domains: [] }, { domains: [{ name: 'staging.musicnerd.xyz', customEnvironmentId: 'env_other' }] },
  { pagination: { next: 123 } }]) test('rejects incomplete or foreign domain ownership', async () => {
  assert.equal((await harness(options).run()).ok, false);
});
test('sanitizes provider failures', async () => {
  for (const o of [{ status: 403 }, { networkError: true }]) {
    const h = harness(o); const r = await h.run(); assert.equal(r.ok, false);
    assert.ok(!JSON.stringify(h.reports).includes('secret'));
  }
});
test('accepts absent embedded domains after verifying dedicated endpoint', async () => {
  const r = await harness().run(); assert.equal(r.ok, true); assert.equal(r.checks.stagingDomainOwnership, true);
  assert.equal(r.checks.embeddedStagingDomains, undefined);
});
test('does not follow an untrusted alias deployment ID', async () => {
  const h = harness({ alias: { deploymentId: '../private' } }); assert.equal((await h.run()).ok, false);
  assert.ok(!h.calls.some(c => c.url.includes('/v13/deployments/')));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { verifyBuildStorage } from './verifyBuildStorage.mjs';

const url = `https://${'s'.repeat(20)}.supabase.co`;
const hash = createHash('sha256').update(url).digest('hex');
function harness(options = {}) {
  const calls = [];
  const env = { VERCEL: '1', VERCEL_TARGET_ENV: 'staging', VERCEL_ENV: 'preview',
    SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: 'private-key', RELEASE_SUPABASE_URL_SHA256: hash, ...options.env };
  return { calls, run: () => verifyBuildStorage({ env, fetchFn: async (u, init) => {
    calls.push({ url: u, ...init });
    if (options.networkError) throw new Error('private provider error');
    return new Response(options.body ?? JSON.stringify({ id: 'vault-files' }), { status: options.status || 200 });
  } }) };
}
test('staging checks identity before one read-only bucket request', async () => {
  const h = harness(); assert.deepEqual(await h.run(), { environment: 'staging', identity: true, storageRead: true });
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].url, `${url}/storage/v1/bucket/vault-files`);
  assert.equal(h.calls[0].method, 'GET'); assert.equal(h.calls[0].redirect, 'error');
  assert.equal(h.calls[0].headers.apikey, 'private-key');
  assert.ok(h.calls[0].signal instanceof AbortSignal);
});
test('production validates identity without accessing storage', async () => {
  const h = harness({ env: { VERCEL_TARGET_ENV: 'production', VERCEL_ENV: 'production' } });
  assert.deepEqual(await h.run(), { environment: 'production', identity: true }); assert.equal(h.calls.length, 0);
});
test('accepts one trailing slash in a canonical URL', async () => {
  assert.equal((await harness({ env: { SUPABASE_URL: `${url}/` } }).run()).identity, true);
});
for (const env of [
  { SUPABASE_URL: 'https://wrong.invalid' }, { SUPABASE_URL: `${url}/extra` },
  { SUPABASE_URL: `${url}//` }, { SUPABASE_URL: `${url}?q=secret` },
  { RELEASE_SUPABASE_URL_SHA256: '' }, { RELEASE_SUPABASE_URL_SHA256: 'a'.repeat(64) },
  { SUPABASE_SERVICE_ROLE_KEY: '' }, { VERCEL_TARGET_ENV: undefined },
]) test(`fails before network with invalid configuration ${Object.keys(env).join()}`, async () => {
  const h = harness({ env }); await assert.rejects(h.run(), e => !e.message.includes('private') && !e.message.includes(url));
  assert.equal(h.calls.length, 0);
});
for (const options of [{ status: 403 }, { status: 302 }, { networkError: true }, { body: 'private-invalid-json' },
  { body: JSON.stringify({ id: 'other-bucket', message: 'private' }) }]) test('bucket failure is sanitized and blocks build', async () => {
  const h = harness(options); await assert.rejects(h.run(), { message: 'Staging storage read failed' });
});
test('local builds and ordinary previews do not use integration credentials', async () => {
  for (const env of [{ VERCEL: undefined, VERCEL_TARGET_ENV: undefined }, { VERCEL_TARGET_ENV: 'preview' }]) {
    const h = harness({ env }); assert.deepEqual(await h.run(), { skipped: true }); assert.equal(h.calls.length, 0);
  }
});

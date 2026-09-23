import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

/** Validate write-only configuration inside Vercel without exporting any values. */
export async function verifyBuildStorage({ env = process.env, fetchFn = fetch } = {}) {
  if (env.VERCEL !== '1') return { skipped: true };
  const environment = env.VERCEL_TARGET_ENV;
  if (!environment) throw new Error('Missing Vercel target environment');
  if (!['staging', 'production'].includes(environment)) return { skipped: true };
  const raw = env.SUPABASE_URL || '';
  if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co\/?$/.test(raw))
    throw new Error('Storage URL identity mismatch');
  const url = raw.replace(/\/$/, '');
  const expected = env.RELEASE_SUPABASE_URL_SHA256 || '';
  if (!/^[a-f0-9]{64}$/.test(expected) || createHash('sha256').update(url).digest('hex') !== expected)
    throw new Error('Storage URL identity mismatch');
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Storage credential missing');
  if (environment === 'production') return { environment, identity: true };
  try {
    const response = await fetchFn(`${url}/storage/v1/bucket/vault-files`, {
      method: 'GET', headers: { apikey: key, Authorization: `Bearer ${key}` },
      redirect: 'error', signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok || (await response.json())?.id !== 'vault-files') throw new Error();
  } catch { throw new Error('Staging storage read failed'); }
  return { environment, identity: true, storageRead: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyBuildStorage().then(result => console.log('Release storage guard:', JSON.stringify(result)))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}

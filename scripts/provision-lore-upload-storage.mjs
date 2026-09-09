// Explicit provisioning step; does not change profile records or existing files.
// Usage: node scripts/provision-lore-upload-storage.mjs /path/to/environment.env
import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const env = process.argv[2] ? parse(readFileSync(process.argv[2])) : process.env;
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Storage environment variables are required');
const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const name = 'lore-upload-staging';
const fileSizeLimit = 10 * 1024 * 1024;
const allowedMimeTypes = ['application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/webp', 'audio/mpeg', 'audio/wav'];
const existing = await client.storage.getBucket(name);
if (existing.error) {
    if (!['400', '404'].includes(String(existing.error.statusCode)) || !/not found/i.test(existing.error.message)) throw existing.error;
    const created = await client.storage.createBucket(name, { public: false, fileSizeLimit, allowedMimeTypes });
    if (created.error) throw created.error;
}
const { data, error } = await client.storage.getBucket(name);
if (error) throw error;
if (data.public || Number(data.file_size_limit) !== fileSizeLimit || allowedMimeTypes.some(t => !data.allowed_mime_types?.includes(t))) {
    throw new Error('Existing bucket settings differ: require PRIVATE, 10485760-byte limit and the documented MIME allowlist. No existing settings changed.');
}
console.log(JSON.stringify({ host: new URL(env.SUPABASE_URL).hostname, bucket: data.name, public: data.public, fileSizeLimit: data.file_size_limit }));

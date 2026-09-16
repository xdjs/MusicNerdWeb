import { requireAuth } from '@/lib/auth-helpers';
import { getSupabaseAdmin } from '@/server/lib/supabase';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { getUserById, getUserByPrivyId } from '@/server/utils/queries/userQueries';

export const dynamic = 'force-dynamic';
const BUCKET = 'user-profile-images';
const MAX_BYTES = 2 * 1024 * 1024;

export async function GET(request?: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;
  try {
    const privyId = auth.session.user.privyUserId;
    const owner = privyId ? await getUserByPrivyId(privyId) : await getUserById(auth.userId);
    if (!owner) return Response.json({ error: 'Account not found' }, { status: 401 });
    const expected = request?.headers.get('X-Profile-Account');
    if (expected && expected !== owner.id) return Response.json({ error: 'Your account changed. Refresh and try again.' }, { status: 409 });
    const folder = owner.privyUserId ? `identity-${createHash('sha256').update(owner.privyUserId).digest('hex')}` : owner.id;
    const storage = getSupabaseAdmin().storage.from(BUCKET);
    let photoFolder: string | null = null;
    for (const candidate of [...new Set([folder, owner.id])]) {
      const { data: files, error: listError } = await storage.list(candidate, { limit: 1, search: 'avatar.webp' });
      if (listError) throw listError;
      if (files?.some(file => file.name === 'avatar.webp')) { photoFolder = candidate; break; }
    }
    if (!photoFolder) return Response.json({ userId: owner.id, url: null }, { headers: { 'Cache-Control': 'private, no-store' } });
    const { data, error } = await storage.createSignedUrl(`${photoFolder}/avatar.webp`, 3600);
    if (error) throw error;
    return Response.json({ userId: owner.id, url: `${data.signedUrl}&v=${Date.now()}` }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return Response.json({ error: 'Could not load your profile photo' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;
  // Cookie-authenticated uploads must originate from this app.
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (Number(request.headers.get('content-length')) > MAX_BYTES + 65536) return Response.json({ error: 'Choose an image smaller than 2 MB' }, { status: 413 });
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_BYTES || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return Response.json({ error: 'Choose a JPG, PNG or WebP image smaller than 2 MB' }, { status: 400 });
    }
    let output: Buffer;
    try {
      // Decode, bound pixel count, normalize orientation, strip metadata and re-encode.
      const input = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 20_000_000, animated: false });
      const metadata = await input.metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) throw new Error('Unsupported image');
      output = await input.rotate().resize(512, 512, { fit: 'cover' }).webp({ quality: 85 }).toBuffer();
    } catch {
      return Response.json({ error: 'This image could not be read. Try another JPG, PNG or WebP.' }, { status: 400 });
    }
    // Derive ownership exclusively from the verified MusicNerd session.
    const privyId = auth.session.user.privyUserId;
    const owner = privyId ? await getUserByPrivyId(privyId) : await getUserById(auth.userId);
    if (!owner) return Response.json({ error: 'Account not found' }, { status: 401 });
    const expected = request?.headers.get('X-Profile-Account');
    if (expected && expected !== owner.id) return Response.json({ error: 'Your account changed. Refresh and try again.' }, { status: 409 });
    const folder = owner.privyUserId ? `identity-${createHash('sha256').update(owner.privyUserId).digest('hex')}` : owner.id;
    const storage = getSupabaseAdmin().storage.from(BUCKET);
    const { error } = await storage.upload(`${folder}/avatar.webp`, output, { contentType: 'image/webp', upsert: true, cacheControl: '0' });
    if (error) throw error;
    return Response.json({ success: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return Response.json({ error: 'Could not save your profile photo. Try again.' }, { status: 503 });
  }
}

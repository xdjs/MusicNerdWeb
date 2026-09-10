import { randomUUID } from 'node:crypto';
import { getServerAuthSession } from '@/server/auth';
import { getDevSession } from '@/server/utils/dev-auth';
import { canEditArtist } from '@/server/utils/artistEditAuth';
import { getSupabaseAdmin } from '@/server/lib/supabase';
import { MAX_VAULT_FILE_BYTES, VAULT_UPLOAD_TYPES, VAULT_UPLOAD_LIMIT_LABEL } from '@/lib/vaultUpload';
import { resolveUploadType } from '@/server/utils/resolveUploadType';
import { LORE_UPLOAD_BUCKET, signUploadTicket } from '@/server/utils/vaultUploadTicket';

export async function POST(req: Request) {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    try {
        const { artistId, name, type, size } = await req.json();
        if (typeof artistId !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(artistId) || typeof name !== 'string' || !name.trim() || name.length > 255 || typeof type !== 'string' || !Number.isInteger(size) || size <= 0 || size > MAX_VAULT_FILE_BYTES) {
            return Response.json({ error: `Choose a file up to ${VAULT_UPLOAD_LIMIT_LABEL}.` }, { status: 400 });
        }
        if (!(await canEditArtist(session.user.id, artistId))) return Response.json({ error: 'Not authorized for this artist' }, { status: 403 });
        const resolvedType = resolveUploadType(name, type, VAULT_UPLOAD_TYPES);
        if (!resolvedType) return Response.json({ error: 'File type not supported' }, { status: 400 });
        const path = `${artistId}/${randomUUID()}_${name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
        const { data, error } = await getSupabaseAdmin().storage.from(LORE_UPLOAD_BUCKET).createSignedUploadUrl(path);
        if (error) throw error;
        return Response.json({ signedUrl: data.signedUrl, contentType: resolvedType, ticket: signUploadTicket({ userId: session.user.id, artistId, path, name, type: resolvedType, size, expires: Date.now() + 15 * 60_000 }) });
    } catch (error) {
        console.error('[vault/upload/sign]', error);
        return Response.json({ error: 'Could not prepare file storage. Please try again.' }, { status: 500 });
    }
}

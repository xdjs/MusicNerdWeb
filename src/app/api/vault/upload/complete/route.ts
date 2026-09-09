import { getServerAuthSession } from '@/server/auth';
import { getDevSession } from '@/server/utils/dev-auth';
import { canEditArtist } from '@/server/utils/artistEditAuth';
import { getSupabaseAdmin, VAULT_BUCKET } from '@/server/lib/supabase';
import { LORE_UPLOAD_BUCKET, readUploadTicket } from '@/server/utils/vaultUploadTicket';
import { MAX_VAULT_FILE_BYTES, getUploadSourceType } from '@/lib/vaultUpload';
import { validateMagicBytes } from '@/server/utils/validateMagicBytes';
import { extractPdfText } from '@/server/utils/extractPdfText';
import { getVaultUploadByPath, insertVaultSource } from '@/server/utils/queries/dashboardQueries';
import { queueLoreRefresh } from '@/server/utils/queries/loreRefresh';
import { getLoreClaimGeneration } from '@/server/utils/queries/lorePersistence';
import { OwnershipChangedError } from '@/server/utils/queries/ownershipWrites';

export const maxDuration = 60;

async function refreshAfterUpload(artistId: string, expectedClaimId: string | null): Promise<string | undefined> {
    try { await queueLoreRefresh(artistId, expectedClaimId); }
    catch (error) {
        console.error('[vault/upload/complete] Saved upload; Lore enqueue failed', error);
        return 'File saved. Lore refresh could not start; use Look again to retry. Do not upload the file again.';
    }
}

export async function POST(req: Request) {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    let unpublishedPath: string | undefined;
    let uploadArtistId: string | undefined;
    let uploadClaimId: string | null = null;
    try {
        const body = await req.json();
        let ticket;
        try { ticket = readUploadTicket(String(body.ticket ?? ''), session.user.id); }
        catch { return Response.json({ error: 'Upload expired or invalid. Please try again.' }, { status: 400 }); }
        const expectedClaimId = await getLoreClaimGeneration(ticket.artistId);
        if (!(await canEditArtist(session.user.id, ticket.artistId))) return Response.json({ error: 'Not authorized for this artist' }, { status: 403 });
        uploadClaimId = expectedClaimId;
        uploadArtistId = ticket.artistId;
        const storage = getSupabaseAdmin().storage;
        const prior = await getVaultUploadByPath(ticket.artistId, ticket.path);
        if (prior) {
            const warning = await refreshAfterUpload(ticket.artistId, expectedClaimId);
            return Response.json({ source: prior, warning });
        }
        const { data: file, error } = await storage.from(LORE_UPLOAD_BUCKET).download(ticket.path);
        if (error || !file) throw error ?? new Error('Upload missing');
        if (file.size !== ticket.size || file.size > MAX_VAULT_FILE_BYTES) return Response.json({ error: 'File size does not match the approved upload' }, { status: 400 });
        const buffer = Buffer.from(await file.arrayBuffer());
        if (!validateMagicBytes(buffer, ticket.type)) return Response.json({ error: 'File content does not match its type' }, { status: 400 });
        const extractedText = ticket.type === 'application/pdf' ? await extractPdfText(buffer)
            : ticket.type.startsWith('text/') || ticket.type === 'application/json' ? buffer.toString('utf8') : null;
        const { error: publishError } = await storage.from(VAULT_BUCKET).upload(ticket.path, buffer, { contentType: ticket.type, upsert: true });
        if (publishError) throw publishError;
        unpublishedPath = ticket.path;
        const url = storage.from(VAULT_BUCKET).getPublicUrl(ticket.path).data.publicUrl;
        const inserted = await insertVaultSource({ artistId: ticket.artistId, url, title: ticket.name,
            snippet: extractedText?.slice(0, 300) ?? `Uploaded file: ${ticket.name}`, extractedText,
            type: getUploadSourceType(ticket.type),
            status: 'approved', fileName: ticket.name, fileSize: file.size, filePath: ticket.path, contentType: ticket.type },
            { userId: session.user.id, expectedClaimId });
        const source = inserted ?? await getVaultUploadByPath(ticket.artistId, ticket.path);
        if (!source) throw new Error('Upload source was not saved');
        unpublishedPath = undefined;
        const refreshWarning = await refreshAfterUpload(ticket.artistId, expectedClaimId);
        try {
            const { error: cleanupError } = await storage.from(LORE_UPLOAD_BUCKET).remove([ticket.path]);
            if (cleanupError) console.error('[vault/upload/complete] Staging cleanup failed', cleanupError);
        } catch (cleanupError) { console.error('[vault/upload/complete] Staging cleanup failed', cleanupError); }
        return Response.json({ source, warning: [refreshWarning, ticket.type === 'application/pdf' && !extractedText
            ? 'PDF saved, but no readable text was found. Use a text-based PDF so Lore can read it.' : undefined].filter(Boolean).join(' ') || undefined });
    } catch (error) {
        if (unpublishedPath && uploadArtistId) {
            try {
                // A lost transaction response is not proof that INSERT rolled back.
                // Never delete a committed upload on an ambiguous network failure.
                const saved = await getVaultUploadByPath(uploadArtistId, unpublishedPath);
                if (saved && !(error instanceof OwnershipChangedError)) {
                    const warning = await refreshAfterUpload(uploadArtistId, uploadClaimId);
                    return Response.json({ source: saved, warning });
                }
                if (!saved) {
                    const { error: cleanupError } = await getSupabaseAdmin().storage.from(VAULT_BUCKET).remove([unpublishedPath]);
                    if (cleanupError) throw cleanupError;
                }
            } catch (recoveryError) {
                console.error('[vault/upload/complete] Publication reconciliation needs retry', recoveryError);
                return Response.json({ error: 'Could not confirm the upload. Retry this same file to finish; do not create a new upload.', retryCompletion: true }, { status: 503 });
            }
        }
        console.error('[vault/upload/complete]', error);
        if (error instanceof OwnershipChangedError) return Response.json({ error: error.message }, { status: 403 });
        return Response.json({ error: 'Could not finish the upload. Please retry this file.', retryCompletion: true }, { status: 500 });
    }
}

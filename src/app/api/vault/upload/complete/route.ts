import { getServerAuthSession } from '@/server/auth';
import { getDevSession } from '@/server/utils/dev-auth';
import { canEditArtist } from '@/server/utils/artistEditAuth';
import { getSupabaseAdmin, VAULT_BUCKET } from '@/server/lib/supabase';
import { LORE_UPLOAD_BUCKET, readUploadTicket } from '@/server/utils/vaultUploadTicket';
import { MAX_VAULT_FILE_BYTES } from '@/lib/vaultUpload';
import { validateMagicBytes } from '@/server/utils/validateMagicBytes';
import { extractPdfText } from '@/server/utils/extractPdfText';
import { getVaultSourcesByArtistId, insertVaultSource } from '@/server/utils/queries/dashboardQueries';
import { queueLoreRefresh } from '@/server/utils/queries/loreRefresh';

export const maxDuration = 60;

export async function POST(req: Request) {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
    try {
        const body = await req.json();
        let ticket;
        try { ticket = readUploadTicket(String(body.ticket ?? ''), session.user.id); }
        catch { return Response.json({ error: 'Upload expired or invalid. Please try again.' }, { status: 400 }); }
        if (!(await canEditArtist(session.user.id, ticket.artistId))) return Response.json({ error: 'Not authorized for this artist' }, { status: 403 });
        const storage = getSupabaseAdmin().storage;
        const prior = (await getVaultSourcesByArtistId(ticket.artistId)).find(s => s.filePath === ticket.path);
        if (prior) {
            await queueLoreRefresh(ticket.artistId);
            return Response.json({ source: prior });
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
        const url = storage.from(VAULT_BUCKET).getPublicUrl(ticket.path).data.publicUrl;
        const inserted = await insertVaultSource({ artistId: ticket.artistId, url, title: ticket.name,
            snippet: extractedText?.slice(0, 300) ?? `Uploaded file: ${ticket.name}`, extractedText,
            type: ticket.type.startsWith('image/') ? 'image' : ticket.type.startsWith('audio/') ? 'audio' : 'document',
            status: 'approved', fileName: ticket.name, fileSize: file.size, filePath: ticket.path, contentType: ticket.type });
        const source = inserted ?? (await getVaultSourcesByArtistId(ticket.artistId)).find(s => s.filePath === ticket.path);
        if (!source) throw new Error('Upload source was not saved');
        await queueLoreRefresh(ticket.artistId);
        await storage.from(LORE_UPLOAD_BUCKET).remove([ticket.path]);
        return Response.json({ source, warning: ticket.type === 'application/pdf' && !extractedText
            ? 'PDF saved, but no readable text was found. Use a text-based PDF so Lore can read it.' : undefined });
    } catch (error) {
        console.error('[vault/upload/complete]', error);
        return Response.json({ error: 'Could not finish the upload. Please try again.' }, { status: 500 });
    }
}

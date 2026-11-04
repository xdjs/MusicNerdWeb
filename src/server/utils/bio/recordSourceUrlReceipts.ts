import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { publicKnowledgeUrl } from '@/server/utils/artistDoc/publicKnowledgeUrl';
import type { ScopedWriteDb } from '@/server/utils/queries/ownershipWrites';

/** Policy receipt only, never source approval. Call inside the text/lineage transaction. */
export async function recordSourceUrlReceipts(tx: Pick<ScopedWriteDb, 'execute'>, sources: unknown) {
    if (!Array.isArray(sources)) return;
    const urls = new Set<string>();
    for (const source of sources) {
        if (source && typeof source === 'object' && typeof source.url === 'string' && publicKnowledgeUrl(source.url)) urls.add(source.url);
    }
    for (const url of [...urls].sort()) {
        const bytes = Buffer.from(url, 'utf8');
        // PostgreSQL text cannot preserve NUL or unpaired UTF16 surrogates.
        if (bytes.toString('utf8') !== url || url.includes('\0')) continue;
        const hash = createHash('sha256').update(bytes).digest('hex');
        try {
            await tx.execute(sql`insert into mn_private.public_url_receipts(url_hash,url,policy_version)
                values(decode(${hash},'hex'),${url},1) on conflict(url_hash,policy_version) do nothing`);
            const result = await tx.execute(sql`select encode(convert_to(url,'UTF8'),'hex') as url_hex
                from mn_private.public_url_receipts where url_hash=decode(${hash},'hex') and policy_version=1`);
            const rows = Array.isArray(result) ? result : (result as unknown as {rows: {url_hex: string}[]}).rows;
            if (rows?.length !== 1 || rows[0]?.url_hex !== bytes.toString('hex')) throw new Error('URL receipt storage conflict');
        } catch {
            // SQL driver errors carry bound URL parameters; never propagate them to action logs.
            throw new Error('URL receipt could not be stored or verified');
        }
    }
}

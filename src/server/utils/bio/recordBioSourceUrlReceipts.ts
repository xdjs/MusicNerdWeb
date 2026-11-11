import { recordSourceUrlReceipts } from './recordSourceUrlReceipts';
import type { ScopedWriteDb } from '@/server/utils/queries/ownershipWrites';
/** Retain malformed/manual lineage unchanged; only known evidence-bearing manifests carry receipts. */
export async function recordBioSourceUrlReceipts(tx: Pick<ScopedWriteDb, 'execute'>, provenance: unknown) {
    if (!provenance || typeof provenance !== 'object') return;
    const value = provenance as { version?: unknown; kind?: unknown; sources?: unknown };
    if (value.version === 1 && (value.kind === 'generated' || value.kind === 'authored')) {
        await recordSourceUrlReceipts(tx, value.sources);
    }
}

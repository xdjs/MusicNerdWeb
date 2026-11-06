import { createHash } from 'node:crypto';

/** Manual edits retain known generated lineage; never manufacture evidence for legacy text. */
export function retainEditedBioProvenance(previous: string | null, text: string, provenance: unknown): unknown {
    if (previous === text) return provenance ?? null;
    if (provenance == null) return null;
    const bioHash = createHash('sha256').update(text).digest('hex');
    const value = provenance as Record<string, unknown>;
    if (value.version === 1 && (value.kind === 'generated' || value.kind === 'authored') && Array.isArray(value.sources)
        && (value.claimId === null || typeof value.claimId === 'string')
        && value.bioHash === createHash('sha256').update(previous ?? '').digest('hex')) {
        return { ...value, bioHash };
    }
    return { version: 1, kind: 'unknown', bioHash };
}

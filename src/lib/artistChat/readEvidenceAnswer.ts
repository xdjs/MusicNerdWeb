import { z } from 'zod';

const citationSchema = z.object({ sourceId: z.string().regex(/^[1-9]\d*$/), url: z.string().max(4096), title: z.string().max(1000) }).strict();
const passageSchema = z.object({
    text: z.string().min(1).max(6000), citation: citationSchema,
    publishedAt: z.string().nullable(), activityDate: z.string().nullable(), retrievedAt: z.string().nullable(),
}).strict();
export type EvidencePassage = z.infer<typeof passageSchema> & { id: string };

/** Decode structured excerpts only; source-authored brackets never become citation syntax. */
export function readEvidenceAnswer(parts: readonly unknown[]) {
    const passages: EvidencePassage[] = [];
    const sources = new Map<string, z.infer<typeof citationSchema>>();
    const ids = new Set<string>();
    let active = false;
    let invalid = false;
    let status: 'validation_failed' | 'additional_validation_failed' | undefined;
    const safeUrl = (value: string) => {
        try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; }
        catch { return false; }
    };
    for (const part of parts) {
        if (!part || typeof part !== 'object' || !('type' in part) || typeof part.type !== 'string') continue;
        if (part.type === 'source-url') {
            const source = part as { sourceId?: unknown; url?: unknown; title?: unknown };
            const parsed = citationSchema.safeParse({ sourceId: source.sourceId, url: source.url, title: source.title });
            if (parsed.success && safeUrl(parsed.data.url)) sources.set(parsed.data.sourceId, parsed.data);
        }
        if (!part.type.startsWith('data-evidence-')) continue;
        active = true;
        if (invalid || status) continue;
        const event = part as { type: string; id?: unknown; data?: unknown };
        if (event.type === 'data-evidence-mode') {
            if (!z.object({ version: z.literal(1) }).strict().safeParse(event.data).success) invalid = true;
        } else if (event.type === 'data-evidence-status') {
            const parsed = z.object({ code: z.enum(['validation_failed', 'additional_validation_failed']) }).strict().safeParse(event.data);
            if (parsed.success) status = parsed.data.code;
            else invalid = true;
        } else if (event.type === 'data-evidence-passage') {
            const parsed = passageSchema.safeParse(event.data);
            if (!parsed.success || typeof event.id !== 'string' || !event.id || ids.has(event.id) || passages.length >= 2) { invalid = true; continue; }
            const source = sources.get(parsed.data.citation.sourceId);
            if (!source || source.url !== parsed.data.citation.url || source.title !== parsed.data.citation.title) { invalid = true; continue; }
            ids.add(event.id);
            passages.push({ id: event.id, ...parsed.data });
        } else invalid = true;
    }
    return { active, passages, status, invalid };
}

export type LoreSummarySource = { id: string; title?: string | null; type?: string | null };
export type LoreSummary = { text: string; sourceKey: string };

/** Only inventory metadata goes into this key, never source contents or private payloads. */
export function loreSourceKey(sources: LoreSummarySource[]): string {
    return JSON.stringify(sources.map(source => [source.id, source.title ?? '', source.type ?? 'article'])
        .sort((a, b) => a[0].localeCompare(b[0])));
}

/** Hide an old summary immediately when a source is removed, renamed or reclassified. */
export function currentLoreSummary(value: unknown, sources: LoreSummarySource[]): string | null {
    if (!sources.length || !value || typeof value !== 'object') return null;
    const summary = value as Partial<LoreSummary>;
    return typeof summary.text === 'string' && summary.text.trim().length > 0 && summary.text.length <= 900
        && summary.sourceKey === loreSourceKey(sources) ? summary.text : null;
}

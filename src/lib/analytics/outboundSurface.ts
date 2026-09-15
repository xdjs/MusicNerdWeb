/**
 * The surface an off-site link belongs to: an explicit `data-analytics-surface` (dialogs are
 * portalled out of their section, so they carry one), else the enclosing `mn-*` section id, else `page`.
 */
export function outboundSurface(element: Element): string {
    const explicit = element.closest<HTMLElement>('[data-analytics-surface]')?.dataset.analyticsSurface;
    if (explicit) return explicit;
    const section = element.closest('[id^="mn-"]')?.id;
    return section ? section.slice(3) : 'page';
}

import type { SourceView } from "@/lib/onboarding/buildStages";

/** A saved source cut down to what the research view shows, so its text and
 *  verification record never travel to the browser. */
export function toSourceView(source: { url: string; title?: string | null; ogImage?: string | null }): SourceView {
    return { title: source.title ?? null, url: source.url, ogImage: source.ogImage ?? null };
}

import { getLoreClaimGeneration } from '@/server/utils/queries/lorePersistence';
import { getArtistDocStrict } from "@/server/utils/queries/onboardingQueries";
import { getArtistById } from "@/server/utils/queries/artistQueries";
import { renderKnowledgeMarkdown, type DocSource } from "@/server/utils/knowledgeDocMarkdown";

export const dynamic = "force-dynamic";

/** `artists.id` is a uuid column, and getArtistById rethrows on a Postgres
 *  "invalid input syntax for type uuid". Unchecked, /artist/not-a-uuid/llms.txt
 *  lands in the catch below and answers 503 — telling a crawler to come back
 *  and retry a URL that can never work. The shape is checkable without a round
 *  trip, so check it. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
    const { id } = await params;
    if (!UUID.test(id)) {
        return new Response("Not found\n", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
    try {
        // STRICT, so a failed read throws into the catch below and answers
        // 503. getArtistDoc swallows and returns undefined, which would take
        // the "no document yet" branch and hand a crawler a cacheable 404 for
        // an artist we have plenty about.
        if (!(await getLoreClaimGeneration(id))) return new Response("Not found\n", { status: 404, headers: { "Cache-Control": "private, no-store" } });
        const [artist, doc] = await Promise.all([getArtistById(id), getArtistDocStrict(id)]);

        // 404, NOT AN EMPTY FILE. An artist with no document yet is not the
        // same as an artist we know nothing about, and a crawler that caches a
        // blank page will not come back for the real one.
        if (!artist) {
            return new Response("Not found\n", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
        }
        if (!doc?.content) {
            return new Response(
                `# ${artist.name ?? "Unknown Artist"}\n\nNo knowledge document has been compiled for this artist yet.\n`,
                { status: 404, headers: { "Content-Type": "text/markdown; charset=utf-8" } },
            );
        }

        const sources = (doc.sources ?? []) as DocSource[];
        const updated = doc.updatedAt ? String(doc.updatedAt).slice(0, 10) : null;

        const body = renderKnowledgeMarkdown({
            name: artist.name ?? "Unknown Artist",
            content: doc.content,
            sources,
            header: `> Compiled by Music Nerd from ${sources.length} source${sources.length === 1 ? "" : "s"}`
                + `${updated ? `, last updated ${updated}` : ""}.`,
        });

        return new Response(body, {
            headers: {
                "Content-Type": "text/markdown; charset=utf-8",
                // A document changes when a source is approved or the artist
                // answers something — minutes at the fastest, never per-request.
                // Serving a slightly stale copy instantly beats rebuilding it
                // for every crawler that asks.
                "Cache-Control": "private, no-store",
                "X-Robots-Tag": "index, follow",
            },
        });
    } catch (e) {
        console.error("[artist/llms.txt] Error:", e);
        return new Response("Temporarily unavailable\n", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
    }
}

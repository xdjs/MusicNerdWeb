/**
 * An artist's links, from a database that already knows them.
 *
 * We had been inferring social accounts from web search: issue queries, fetch
 * pages, judge whether each is about the right person, probe handles, abstain
 * when two answer. Every one of those steps can be wrong, and most of them have
 * been. Meanwhile MusicBrainz is a free, community-curated database whose whole
 * purpose is holding exactly this, and it has entries for six of the seven
 * artists we test against — including the two obscure ones.
 *
 * On those seven it returns the artist's own website (which our corroboration
 * machinery spends a whole search pass hunting for), their Instagram, X,
 * Facebook, SoundCloud, Bandcamp and YouTube, curated by people rather than
 * inferred by us. Hardwell's four match our hand-verified truth exactly,
 * including facebook=djhardwell, which no probe of "hardwell" would ever reach.
 *
 * MATCHING IS THE WHOLE PROBLEM, so it is done by identifier where possible.
 * MusicBrainz links many artists to Spotify and Deezer; where it does and the id
 * is one we already hold, the entry is certainly the right person and its links
 * can be trusted outright. Where it does not — which is the common case for
 * small artists — we require a single candidate whose name matches exactly, and
 * we hand its links to the same verification the search path uses rather than
 * trusting them. Three artists called Black Dave are in our own directory; a
 * name is not an identifier.
 *
 * Rate limited to one request a second by MusicBrainz's terms, and the general
 * discovery path makes two per artist.
 */

const MB = "https://musicbrainz.org/ws/2";
/** MusicBrainz asks for a contactable agent and blocks generic ones. */
const HEADERS = {
    Accept: "application/json",
    "User-Agent": "MusicNerd/1.0 (https://musicnerd.net)",
};
/** Their published limit is one request per second, averaged. */
const RATE_LIMIT_MS = 1_100;
const TIMEOUT_MS = 8_000;
/** Below this, MusicBrainz's own scorer does not think the name really matched. */
const MIN_SCORE = 90;

type MusicBrainzRequestResult =
    | { status: "ok"; data: Record<string, unknown> }
    | { status: "not-found" }
    | { status: "unavailable" };

export type MusicBrainzLinks = {
    /** How we know this entry is the right artist. */
    matchedBy: "identifier" | "exact-name";
    /** Every url MusicBrainz holds, for the caller to resolve and verify. */
    urls: string[];
    /** Their official site, if it names one — the hub our search pass hunts for. */
    homepage: string | null;
};

const fold = (v: string) => (v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function requestMusicBrainz(
    path: string,
    timeoutMs: number = TIMEOUT_MS,
): Promise<MusicBrainzRequestResult> {
    try {
        const res = await fetch(`${MB}${path}`, {
            headers: HEADERS,
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (!res.ok) {
            return res.status === 404
                ? { status: "not-found" }
                : { status: "unavailable" };
        }
        const data = await res.json();
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            return { status: "unavailable" };
        }
        return { status: "ok", data: data as Record<string, unknown> };
    } catch {
        return { status: "unavailable" };
    }
}

async function mb(
    path: string,
    timeoutMs: number = TIMEOUT_MS,
): Promise<Record<string, unknown> | null> {
    const result = await requestMusicBrainz(path, timeoutMs);
    return result.status === "ok" ? result.data : null;
}

const wait = (ms: number): Promise<void> => new Promise<void>(r => setTimeout(() => r(), ms));

/**
 * Paces every call in this process, not just the ones inside a single lookup.
 *
 * A bare timestamp did not actually do this, as a review pointed out: two
 * callers arriving together both read the same `lastCallAt`, both compute the
 * same delay, both wake at the same moment and both fire — which is precisely
 * the burst the limit exists to prevent. Two concurrent claim approvals were
 * enough. MusicBrainz answers a throttled request with an entry and no
 * relations, which reads exactly like an artist it has never heard of, so the
 * failure was silent and looked like missing data.
 *
 * Each caller chains onto the previous one and computes its delay only when it
 * reaches the front. A deadline-expired caller skips without sleeping, so a
 * burst of abandoned user-facing lookups cannot leave ghost reservations that
 * block later background work.
 */
let paceQueue: Promise<void> = Promise.resolve();
let lastCallAt = 0;
async function sinceLastCall(deadline: number = Number.POSITIVE_INFINITY): Promise<boolean> {
    let reserved = false;
    let cancelled = false;
    const mine: Promise<void> = paceQueue.then(async () => {
        if (cancelled) return;
        const delay = Math.max(0, lastCallAt + RATE_LIMIT_MS - Date.now());
        if (Date.now() + delay >= deadline) return;
        if (delay > 0) await wait(delay);
        if (cancelled || Date.now() >= deadline) return;
        lastCallAt = Date.now();
        reserved = true;
    });
    // Swallow rejections so one failure cannot poison the queue for everyone.
    paceQueue = mine.then(() => undefined, () => undefined);

    if (!Number.isFinite(deadline)) {
        await mine;
        return reserved;
    }

    const remaining = Math.max(0, deadline - Date.now());
    if (remaining === 0) {
        cancelled = true;
        return false;
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const deadlineReached = new Promise<boolean>((resolve) => {
        timeoutId = setTimeout(() => {
            cancelled = true;
            resolve(false);
        }, remaining);
    });
    const result = await Promise.race([
        mine.then(() => reserved),
        deadlineReached,
    ]);
    if (timeoutId) clearTimeout(timeoutId);
    return result;
}

/**
 * Look an artist up and return what MusicBrainz holds, or null when it cannot
 * say confidently who they mean.
 *
 * Never throws: this is an enrichment, and losing it should cost a few links,
 * not the run.
 */
export async function fetchMusicBrainzLinks(
    artistName: string,
    held: { spotify?: string | null; deezer?: string | null },
): Promise<MusicBrainzLinks | null> {
    if (!artistName?.trim()) return null;

    // Their limit is averaged, so back-to-back lookups across several artists
    // exhaust it even when each lookup paces itself internally. A run that gets
    // throttled comes back with an entry and no relations, which reads exactly
    // like an artist MusicBrainz has never heard of — the benchmark saw Pete
    // Rango score 6/7 and 3/7 on consecutive runs for this reason alone.
    await sinceLastCall();

    const search = await mb(`/artist?query=${encodeURIComponent(`artist:"${artistName}"`)}&fmt=json&limit=5`);
    const candidates = ((search?.artists as Array<Record<string, unknown>>) ?? [])
        .filter(a => Number(a.score ?? 0) >= MIN_SCORE);
    if (candidates.length === 0) return null;

    const wantName = fold(artistName);
    let fallback: MusicBrainzLinks | null = null;

    for (const cand of candidates.slice(0, 3)) {
        await sinceLastCall();
        const detail = await mb(`/artist/${String(cand.id)}?inc=url-rels&fmt=json`);
        const relations = (detail?.relations as Array<Record<string, unknown>>) ?? [];
        const urls = relations
            .map(r => (r.url as Record<string, unknown> | undefined)?.resource)
            .filter((u): u is string => typeof u === "string" && u.length > 0);
        if (urls.length === 0) continue;

        const homepage = relations
            .filter(r => r.type === "official homepage")
            .map(r => (r.url as Record<string, unknown> | undefined)?.resource)
            .find((u): u is string => typeof u === "string") ?? null;

        // An id we already hold settles it — this is certainly the same artist,
        // whoever else shares the name.
        // WHOLE path segment, not a substring. `includes("deezer.com/artist/123")`
        // also matches .../1234, so a different artist whose id merely starts
        // with ours was promoted to an IDENTIFIER match — the strongest verdict
        // this module can return, which skips exact-name verification entirely
        // and trusts every link on the wrong entry.
        const idFrom = (u: string, host: string): string | null => {
            try {
                const parsed = new URL(u);
                if (!parsed.hostname.endsWith(host)) return null;
                const seg = parsed.pathname.split("/").filter(Boolean);
                const at = seg.indexOf("artist");
                return at >= 0 ? (seg[at + 1] ?? null) : null;
            } catch { return null; }
        };
        const identifies = urls.some(u =>
            (held.spotify && idFrom(u, "spotify.com") === held.spotify)
            || (held.deezer && idFrom(u, "deezer.com") === held.deezer));
        if (identifies) return { matchedBy: "identifier", urls, homepage };

        // Otherwise remember the first exact-name match and keep looking for an
        // identifier, which outranks it.
        if (!fallback && fold(String(cand.name ?? "")) === wantName) {
            fallback = { matchedBy: "exact-name", urls, homepage };
        }
    }

    // Only when the name is unambiguous here. If several entries scored highly,
    // MusicBrainz is telling us the name is shared and we should not guess.
    if (fallback && candidates.filter(c => fold(String(c.name ?? "")) === wantName).length === 1) {
        return fallback;
    }
    return null;
}

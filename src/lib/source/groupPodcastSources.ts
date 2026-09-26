import { podcastService } from "./podcastService";

export interface PodcastSource {
    id: string;
    artistId?: string;
    url: string;
    title?: string | null;
    type?: string | null;
    ogImage?: string | null;
    podcastEpisodeKey?: string | null;
    podcastShowTitle?: string | null;
    podcastEpisodeTitle?: string | null;
}

export type LoreCard<T extends PodcastSource> =
    | { kind: "source"; id: string; source: T; type: string }
    | { kind: "podcast"; id: string; sources: T[]; type: "audio" };

/** Pure public-view projection. Source rows and their independent status stay intact. */
export function groupPodcastSources<T extends PodcastSource>(sources: T[]): LoreCard<T>[] {
    const groups = new Map<string, T[]>();
    for (const source of sources) {
        if (!source.podcastEpisodeKey || !podcastService(source.url)) continue;
        const key = `${source.artistId ?? ""}\0${source.podcastEpisodeKey}`;
        const siblings = groups.get(key) ?? [];
        siblings.push(source);
        groups.set(key, siblings);
    }

    const seen = new Set<string>();
    const cards: LoreCard<T>[] = [];
    for (const source of sources) {
        const key = `${source.artistId ?? ""}\0${source.podcastEpisodeKey ?? ""}`;
        const siblings = groups.get(key);
        if (siblings && siblings.length > 1) {
            if (!seen.has(key)) {
                cards.push({ kind: "podcast", id: source.id, sources: siblings, type: "audio" });
                seen.add(key);
            }
        } else {
            cards.push({ kind: "source", id: source.id, source, type: source.type ?? "article" });
        }
    }
    return cards;
}

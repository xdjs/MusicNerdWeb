import type { Score } from "@/lib/evals/Score";
import { isBlockedSourceHost } from "@/lib/source/sourceAuthority";

type ForbiddenHostsMetadata = { kept: number; namesake: string[]; blocked: string[] };

/**
 * 1 when none of the sources research kept is about somebody else or on a host the
 * pipeline blocks, else 0. `forbidHosts` are the case's known namesakes; blocked hosts
 * come from the pipeline's own list so this cannot pass while the two drift apart.
 * A namesake and a blocked host are different failures (the blocked page really is
 * about the artist) and are reported apart.
 */
export function scoreForbiddenHosts(urls: string[], forbidHosts: string[]): Score<ForbiddenHostsMetadata> {
    const namesake = urls.filter(u => forbidHosts.some(h => u.includes(h)));
    const blocked = urls.filter(u => isBlockedSourceHost(u));
    return {
        name: "forbidden_hosts",
        score: namesake.length + blocked.length === 0 ? 1 : 0,
        metadata: { kept: urls.length, namesake, blocked },
    };
}

import type { Score } from "@/lib/evals/Score";
import { scoreHandles } from "@/lib/evals/scorers/scoreHandles";

type NoWrongHandlesMetadata = { wrong: string[] };

/**
 * 0 when research stored any handle that is not the artist's, else 1. Wrong is
 * `scoreHandles`'s wrong: a handle that differs from a known one, or one that belongs
 * to another artist on any platform. A missing handle is not wrong. `scoreHandles`
 * averages a wrong handle in with the right ones; this does not, because a stranger's
 * account on an artist's profile is the failure research must never trade for
 * anything (docs/evals.md: a change that drops a case below 1 does not merge).
 */
export function scoreNoWrongHandles(
    found: Record<string, string | null | undefined>,
    expect: Record<string, string | string[]>,
    forbidHandles: Record<string, string[]> = {},
): Score<NoWrongHandlesMetadata> {
    const { wrong } = scoreHandles(found, expect, forbidHandles).metadata;
    return { name: "no_wrong_handles", score: wrong.length === 0 ? 1 : 0, metadata: { wrong } };
}

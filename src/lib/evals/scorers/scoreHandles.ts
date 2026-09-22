import type { Score } from "@/lib/evals/Score";

type HandlesMetadata = { known: number; correct: string[]; wrong: string[]; missed: string[] };

/**
 * How many of an artist's known handles research found, on the research benchmark's
 * rules (scripts/research-benchmark.ts): a case-insensitive match against any accepted
 * handle is correct, nothing stored is missed, anything else is wrong, and a handle
 * that belongs to another artist is wrong even on a platform we expected nothing for.
 *
 * Score is `(correct - wrong) / known`, floored at 0: somebody else's handle is worse
 * than a missing one. With nothing known, the score is 1 unless something wrong was stored.
 */
export function scoreHandles(
    found: Record<string, string | null | undefined>,
    expect: Record<string, string | string[]>,
    forbidHandles: Record<string, string[]> = {},
): Score<HandlesMetadata> {
    const correct: string[] = [], wrong: string[] = [], missed: string[] = [];
    for (const [platform, want] of Object.entries(expect)) {
        const accepted = Array.isArray(want) ? want : [want];
        const got = found[platform];
        if (!got) missed.push(`${platform}=${accepted[0]}`);
        else if (accepted.some(w => got.toLowerCase() === w.toLowerCase())) correct.push(`${platform}=${got}`);
        else wrong.push(`${platform}=${got} (want ${accepted.join(" or ")})`);
    }
    // One wrong platform is one wrong, not two: a handle that both differs from the
    // expected value and belongs to someone else gets the reason appended instead.
    const wrongPlatforms = new Set(wrong.map(w => w.split("=")[0]));
    for (const [platform, bad] of Object.entries(forbidHandles)) {
        const got = found[platform];
        if (!got || !bad.some(b => b.toLowerCase() === got.toLowerCase())) continue;
        if (wrongPlatforms.has(platform)) {
            const at = wrong.findIndex(w => w.startsWith(`${platform}=`));
            wrong[at] += " — belongs to another artist";
            continue;
        }
        wrong.push(`${platform}=${got} (belongs to another artist)`);
        wrongPlatforms.add(platform);
    }
    const known = Object.keys(expect).length;
    const score = known === 0 ? (wrong.length === 0 ? 1 : 0) : Math.max(0, (correct.length - wrong.length) / known);
    return { name: "handles", score, metadata: { known, correct, wrong, missed } };
}

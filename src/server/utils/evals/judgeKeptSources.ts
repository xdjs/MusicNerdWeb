import { z } from "zod";
import { generateObject } from "@/server/lib/ai/generateObject";
import { MODEL_JUDGE } from "@/server/lib/ai/models";
import type { ResearchCase } from "@/lib/evals/researchCases";
import type { SourceVerdict } from "@/lib/evals/scorers/scoreSourceRelevance";

export type KeptSource = { url: string; title: string | null; snippet: string | null };

const INSTRUCTIONS = `You grade a music research pipeline. It searched the web for one artist and kept some pages as sources about them.
For each numbered source, decide whether the page is about THIS artist: the person identified by the name, accounts and notes given.
A page about a different person or thing with a similar name (a namesake, a film, a product, a band that shares a word) is not about the artist.
A directory or catalogue page that lists this artist is about the artist. Judge only from the URL, title and snippet given.
Return one verdict for every source, with a short reason.`;

const VERDICTS = z.object({
    verdicts: z.array(z.object({ index: z.number().int(), aboutArtist: z.boolean(), reason: z.string() })),
});

/**
 * The research suite's one judge: is each source research kept about this artist? One
 * call per case on `MODEL_JUDGE`, given the case's hand-verified identity (name, known
 * accounts, namesake note), so it grades the pipeline's own Flash relevance filter with a
 * stronger model (docs/evals.md). A source the judge leaves out counts as not about the
 * artist, so an incomplete answer cannot raise the score. Nothing kept, no call.
 */
export async function judgeKeptSources(researchCase: ResearchCase, sources: KeptSource[]): Promise<SourceVerdict[]> {
    if (sources.length === 0) return [];
    const accounts = Object.entries(researchCase.expect)
        .map(([platform, handle]) => `${platform}: ${Array.isArray(handle) ? handle.join(" or ") : handle}`);
    const prompt = [
        `Artist: ${researchCase.name}`,
        `Known accounts: ${accounts.length ? accounts.join(", ") : "none recorded"}`,
        `Notes: ${researchCase.note}`,
        "",
        "Sources:",
        ...sources.map((s, i) => `${i + 1}. ${s.url}\n   title: ${s.title ?? ""}\n   snippet: ${(s.snippet ?? "").slice(0, 400)}`),
    ].join("\n");

    const { output } = await generateObject({ model: MODEL_JUDGE, instructions: INSTRUCTIONS, prompt, temperature: 0, schema: VERDICTS });
    const byIndex = new Map(output.verdicts.map(v => [v.index, v]));
    return sources.map((s, i) => {
        const v = byIndex.get(i + 1);
        return v ? { url: s.url, aboutArtist: v.aboutArtist, reason: v.reason } : { url: s.url, aboutArtist: false, reason: "no verdict from the judge" };
    });
}

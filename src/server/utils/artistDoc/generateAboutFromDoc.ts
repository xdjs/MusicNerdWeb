import { streamText, type StreamTextOptions } from "@/server/lib/ai/streamText";
import type { DocSource } from "@/server/utils/artistDocService";
import { withGeminiTimeout } from "@/server/utils/artistDoc/withGeminiTimeout";
import { validateCitations } from "@/server/utils/artistDoc/validateCitations";
import { GEMINI_ABOUT_TIMEOUT_MS } from "@/server/utils/artistDoc/geminiTimeouts";
import { MAX_BIO_LENGTH, ABOUT_LENGTH_RULE, ABOUT_STOP_RULE, ABOUT_OPENING_RULE } from "@/lib/bio/bioConstants";

const ABOUT_SYSTEM_INSTRUCTION = (artistName: string) => `You are a music writer. Write the public "About" for "${artistName}" from their cited knowledge document.

WHAT THIS IS: a short editorial paragraph a music publication would run. Not a summary, not a changelog, not a list of true facts with verbs attached. A reader should finish it knowing who this artist IS — not merely what they have done.
- ${ABOUT_LENGTH_RULE} ${ABOUT_STOP_RULE} Plain text only — no markdown, no headers.
- ${ABOUT_OPENING_RULE}
- SELECT — do not inventory. The document holds far more than belongs here. Choose the two or three things that actually say something about this person and leave the rest out. A detail earns its place by revealing something, not by being true. Dates, version numbers and product names are usually the first things to cut.
- FIND THE THROUGH-LINE. These facts belong to one person; say what connects them. If the material shows someone doing several apparently unrelated things, that IS the story — write it as one, not as a list.
- VARY THE SENTENCES. A paragraph of identically shaped declaratives reads as a database dump. That is the most common failure here — reread what you wrote and fix it before answering.
- Concrete over abstract: names, places, songs, scenes. But a specific with no reason to be there is still filler.
- The document quotes the artist's own words. Use what they said as fact, in plain third person — no quotation marks in the About. Their own framing of their work is usually the best line in the document; prefer it to your own.
- CITATIONS: the document's claims already carry [n] markers referencing its SOURCES manifest. When you carry a claim over into the About, keep its [n] marker immediately after it. Do not add a marker to a sentence you wrote yourself with no corresponding cited claim in the document, and never invent a marker number that isn't in the document.
- ANTI-INFLATION: preserve the document's time-scoping — if the document describes something as recent ("on his latest releases", "he's said recently"), keep that framing rather than smoothing it into a general career description.
- No hype phrases ("rising star", "eclectic", "undeniable", "pushing boundaries").
- Never fabricate anything not in the document.`;

/** Only the onboarding auto-build passes `onTextDelta` (docs/llm.md). */
type StreamOptions = Pick<StreamTextOptions, "onTextDelta">;

export async function generateAboutFromDoc(artistName: string, docContent: string, sources: DocSource[] = [], { onTextDelta }: StreamOptions = {}): Promise<string> {
    const response = await withGeminiTimeout(
        streamText({
            onTextDelta,
            prompt: `ARTIST KNOWLEDGE DOCUMENT:\n${docContent}`,
            instructions: ABOUT_SYSTEM_INSTRUCTION(artistName),
            temperature: 0.5,
            thinkingBudget: 0, // see synthesizeArtistDoc

        }),
        GEMINI_ABOUT_TIMEOUT_MS,
    );
    const raw = response.text?.trim();
    if (!raw) throw new Error("About generation returned empty text");
    const about = validateCitations(raw, sources);
    return about.slice(0, MAX_BIO_LENGTH);
}

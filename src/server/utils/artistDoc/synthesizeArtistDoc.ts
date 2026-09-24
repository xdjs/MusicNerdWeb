import { streamText, type StreamTextOptions } from "@/server/lib/ai/streamText";
import { buildDocContext, type DocSource } from "@/server/utils/artistDocService";
import { withGeminiTimeout } from "@/server/utils/artistDoc/withGeminiTimeout";
import { validateCitations } from "@/server/utils/artistDoc/validateCitations";
import { ARTIST_DOC_MAX_CHARS } from "@/lib/bio/bioConstants";

function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
}

const DOC_SYSTEM_INSTRUCTION = (artistName: string) => `You compile an internal knowledge document about the music artist "${artistName}" for Music Nerd — a public artist directory, not a label's internal pitch deck.

Use ONLY these section headers, in this order, and OMIT any section entirely if you have no real, specific material for it (no placeholders, no "not enough signal" lines — just leave the section out):
## Overview
## Career Highlights
## Story hooks
## Sound & Influences
## Discography Highlights
## Industry Connections
## Recent Activity
## Online Presence
## Who They Are
## In Their Own Words
## Audience & Fanbase

Use concrete, source-supported facts and concise bullets. There is no example artist: do not borrow names, anecdotes, quotes, or credits from any template or prior knowledge.

CITATIONS — every factual claim must carry a marker:
- The material below is numbered as a SOURCES manifest ([1], [2], [3]...). Immediately after each claim, add the [n] of the source it came from — e.g. "toured with Fana Hues[4]." Multiple sources for one claim: stack the markers, "[2][5]".
- If you cannot attribute a claim to a specific numbered source, DO NOT include the claim — omit it rather than stating it unattributed.
- Never invent a source number. Only cite ids that actually appear in the SOURCES manifest.
- INTERVIEW sources are the artist's own words — quote them verbatim in quotation marks, never paraphrase, and still cite them.

CORRECTIONS — if a CORRECTIONS FROM THE ARTIST block is present, it is the highest authority in this document, above every source:
- A claim the artist marked REMOVE must not appear in any form. Do not rephrase it, do not soften it, do not keep the part you think is still true. They read it and said it was wrong about them.
- Where the artist supplied a correction, state THEIR version. A source saying otherwise is out of date or mistaken, not a second opinion to balance.
- Corrections carry no [n] marker. Write the corrected claim without one rather than citing a source that contradicts it.
- Never argue with a correction in the text ("though one source says..."). The artist is the authority on their own life.

TIME — today is ${todayISO()}. Read every source against that date.

MOST FACTS ARE PERMANENT. State them plainly, with no hedge and no year attached to them:
- A release, a track, a credit, a placement, a feature, an award, a competition won, a band formed, a label founded, where someone was born or grew up. These happened. They do not stop having happened.
- "He has a song on Jesse Boykins III's EP Bartholomew WAVE I" is permanent. Writing "as of 2019, he had a song on..." is WRONG — it reads as though the song might have since come off the record.

ONLY SCOPE WHAT ACTUALLY DECAYS: a current role or job title, an ongoing partnership, where someone lives now, who they are signed to, who they are "currently" developing or working with, and anything phrased as latest/newest/upcoming. Those can quietly stop being true, so they take the year the source was written: "as of 2019, Parris Pierce was his production partner."

"As of YEAR" attaches to a STATE, never to an action. "As of 2026, he co-directed a documentary" is wrong twice over — co-directing is a completed act, and the phrase reads as though it might be undone. Say when it happened instead: "he co-directed Big Scouse (2026)". If you find yourself writing "as of" in front of a past-tense verb, you want a date in brackets.

THE SOURCE'S DATE IS NOT THE EVENT'S DATE. A 2019 interview mentioning a placement does NOT mean the placement happened in 2019 — it means that by 2019 it had happened. Never attach a source's publication year to an event as if it were the event's year. If a source does not say when something happened, write it with no date at all. A missing date is honest; a wrong one is not.

RECONCILE AGAINST TODAY. Sources were written in the past and describe the future in their own present tense. A release "dropping March 1st", read from a page written before that date, has already come out — write it as released, or drop the date language entirely. NEVER carry "will", "is scheduled to", "upcoming", "coming soon" or a future-dated plan into this document for a date that has already passed. This is a music database: saying a released record is forthcoming is worse than saying nothing about it.

- Two sources disagreeing is usually one being older, not a contradiction. Prefer the newer.
- "date unknown" means you do not know whether a DECAYING claim is current — attribute rather than assert. It changes nothing about permanent facts.
- Never invent a date. Never write a year that appears nowhere in the material.
- The source labels are for YOU, not the reader. Never copy "date unknown", "published ...", or "N years ago" into the document.

ANTI-INFLATION — characterize the artist's body of work only as far as the evidence actually supports:
- A trait, style, or interest shown in only recent material (a handful of posts, one interview answer, the latest release) is described as recent and scoped in time — "on his latest releases", "he's said recently" — never generalized into "his sound is X" or "known for X" when the evidence only covers a narrow recent window.
- Do not extrapolate a whole career or a stable identity from a few data points. If the material shows a shift or a new direction, say it's a shift, not a redescription of everything that came before it.
- ## Sound & Influences describes the stable, evidenced body of work; anything that reads as new or recent belongs in ## Recent Activity instead, scoped with a time-anchored phrase.

OTHER RULES:
- Mine, don't summarize: prefer one specific, tellable detail over three generic facts.
- Name real people, places, songs, venues, and dates whenever the material supports them.
- ## Story hooks: 2-5 bullet points, each one narratable specific a fan would repeat to a friend.
- ## Discography Highlights: HIGHLIGHTS, NOT A CATALOG. AT MOST 6 ENTRIES. The artist's streaming links already list every release and stay current, so copying the catalog in here adds nothing and goes stale the day they put something out.
  DO NOT DESCRIBE THE FORMAT. Never write that something is a single, an EP, an album, a mix or a solo release. The reader can see that, and it is the padding this section keeps filling up with.
  EVERY ENTRY MUST CONTAIN AT LEAST ONE OF: a named collaborator, a named placement (a show, a film, a label, a playlist), or something that actually happened around it. An entry with a title, a year and nothing else FAILS THIS TEST and must be deleted, however much room is left. Check each line you write against that before you keep it.
  Good: "Vi$ions" (2019) — co-produced with Cherele, placed on HBO's Insecure. Bad: "Por Tu Barrio" (2023) — a single.
  Three entries that pass beats six that do not. If fewer than two pass, omit the section entirely; the artist's streaming links already list everything.
  The VERIFIED CATALOG is for TITLES AND DATES, not a list to reproduce. It outranks any date a webpage gives: a release the catalog dates gets that date plainly, "rush (2026)". A release it does not carry gets no date at all.
- ## Industry Connections: for each collaborator you name, say what the collaboration actually was (a track, a project, a mix credit) — never list a bare handle or name with nothing said about what happened. If the material gives you a handle with no indication of what the collaboration was, leave it out rather than padding a list with it.
- ## Who They Are: one or two sentences on something specific and human about them — not a marketing pitch, no "appeals to X demographic" or "multi-genre appeal" language.
- ## In Their Own Words: 2-6 direct quotations, VERBATIM and in quotation marks, each with a short lead-in saying what it is about — how they work, what they believe, advice they have given. This is the section a fan's question is most often answered from, so prefer what the artist actually said to any paraphrase of it. Interviews are full of this material and it is the first thing a summary throws away. Quote only what a source actually contains; never smooth a quote into better English. Biography belongs in the sections above, not here.
- Never fabricate. No hype words ("rising star", "eclectic", "undeniable").
- LENGTH: aim for 1,100-1,400 words where the material genuinely supports it. This is a knowledge base that a fan-facing Q&A reads from, not a summary — a specific you leave out is a question that cannot be answered later. But never pad to reach it: an unsourced or generic line is worse than a shorter document, and a thin source set should produce a short one.`;

/** The build popup's hook into sites 5 and 6: each piece of the draft as the model
 *  writes it. Only the onboarding auto-build passes it (docs/llm.md). */
type StreamOptions = Pick<StreamTextOptions, "onTextDelta">;

export async function synthesizeArtistDoc(artistId: string, presetSources?: DocSource[], { onTextDelta }: StreamOptions = {}): Promise<string> {
    const { artistName, context, sources } = await buildDocContext(artistId, presetSources);
    const response = await withGeminiTimeout(
        streamText({
            onTextDelta,
            prompt: context,
            instructions: DOC_SYSTEM_INSTRUCTION(artistName),
            temperature: 0.4,
            // Flash runs extended thinking by default, which measured
            // 16-21s+ on this call (against sources this size) and blew
            // the publish turn's budget outright. Off cuts it to ~6s
            // p95 with no observed drop in citation accuracy or "mine,
            // don't summarize" specificity — see the knowledge-doc
            // report for the measured A/B (thinking off vs bounded
            // budgets vs default) and side-by-side doc quality.
            thinkingBudget: 0,
        })
    );
    const raw = response.text?.trim();
    if (!raw) throw new Error("Doc synthesis returned empty text");
    const doc = validateCitations(raw, sources);
    return doc.slice(0, ARTIST_DOC_MAX_CHARS);
}

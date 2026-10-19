"use client";

import { useCallback, useMemo, useState } from "react";
import AskAboutArtist from "@/app/artist/[id]/_components/AskAboutArtist";
import type { runArtistResearch } from "@/lib/questionResearch/runArtistResearch";
import type { readSourceDetails } from "@/lib/questionResearch/readSourceDetails";

type ReplaySource = {
  n: number;
  title: string;
  url: string;
  sourceId: string;
  revision: string;
  start: number;
  curation: string;
  text: string;
};
type ReplayCase = {
  id: string;
  artistId: string;
  artistName: string;
  question: string;
  savedAnswer: string;
  illustrativeAnswer: string;
  sources: ReplaySource[];
  followUp: string;
  followUpAnswer: string;
};

const H05: ReplayCase = {
  id: "H05",
  artistId: "e9b0dfaa-cb9b-5b62-9a68-f586bd5875dd",
  artistName: "Oriel Loom",
  question: "Did Pax Cedar produce the Bellwater trio Oriel Loom’s 2022 album Folded Coast?",
  savedAnswer: "I don't have enough information to answer that yet.",
  illustrativeAnswer: "The Pax Cedar credit in these records belongs to the Harrow Quay electronic performer’s 2025 edition, not the Bellwater trio’s 2022 album. [1, 2] These sources don’t establish who produced the trio’s recording. [1, 2]",
  sources: [
    {
      n: 1,
      title: "Oriel Loom subject profile",
      url: "https://example.com/mn1424-heldout/H05/subject-profile",
      sourceId: "vault:38d10adb-a669-5a13-a15b-c752f5752eeb",
      revision: "19800c9d4a5aebb4e21860bf2d9d3c0c57bb28a16a13a80dce0ebcdd2043f5a4",
      start: 0,
      curation: "approved",
      text: "Oriel Loom is a fictional acoustic trio from Bellwater. Its members are Ena Crest, Sol Bracken and Uli Fen. Its album Folded Coast is a 2022 chamber-folk recording. This artist has no connection to the electronic solo performer using the same name in Harrow Quay.",
    },
    {
      n: 2,
      title: "Folded Coast namesake catalog entry",
      url: "https://example.com/mn1424-heldout/H05/namesake-catalog",
      sourceId: "vault:b0288629-6204-57f9-82f7-497f31b181a3",
      revision: "068111e747d9de1c8c66c0f02f587c62eb75ed9de2bea739a0609f88407af0d9",
      start: 0,
      curation: "approved",
      text: "Catalog subject: Oriel Loom, electronic solo performer from Harrow Quay, catalog person OL-ELECTRONIC. Album Folded Coast, 2025 club edition: produced by Pax Cedar. This entry concerns the solo performer, not the Bellwater acoustic trio.",
    },
  ],
  followUp: "What do the saved records establish about the trio?",
  followUpAnswer: "The saved profile describes Oriel Loom as a Bellwater acoustic trio and Folded Coast as its 2022 chamber-folk recording. [1]",
};

const H09: ReplayCase = {
  id: "H09",
  artistId: "93c745b9-d6b0-5391-ad3f-24717fe007c3",
  artistName: "Hush Compass",
  question: "Can we conclude that Dalen Moss did not play on Open Ferries because the saved sleeve does not name them?",
  savedAnswer: "No, the saved sleeve excerpt only lists selected credits, so Dalen Moss not being named there doesn't show they didn't play on Open Ferries. [1] I couldn’t confirm the other details.",
  illustrativeAnswer: "No. The sleeve lists only selected credits, so Dalen Moss’s absence from it doesn’t establish that they didn’t play on Open Ferries. [1] These records don’t settle whether Dalen Moss played on Open Ferries. [1]",
  sources: [{
    n: 1,
    title: "Open Ferries selected sleeve excerpt",
    url: "https://example.com/mn1424-heldout/H09/selected-sleeve",
    sourceId: "vault:81766ca5-354a-5f03-b0de-63802c849411",
    revision: "4644d4c713c45048449b768253f5b827fcefe6cec403a35dba10c1524ba0244d",
    start: 0,
    curation: "approved",
    text: "Hush Compass — Open Ferries digital sleeve excerpt. Songwriting: Hush Compass. Lead vocal: Hush Compass. This short excerpt lists selected credits only; full engineering and additional instrumental personnel are not provided. Dalen Moss is not named in this excerpt.",
  }],
  followUp: "What credits does the sleeve include?",
  followUpAnswer: "The excerpt names songwriting and lead vocals, and says it does not provide the full engineering or additional instrumental personnel. [1]",
};

const H11: ReplayCase = {
  id: "H11",
  artistId: "9a0c2d0d-adec-5098-bfaa-63391986c91d",
  artistName: "Lumen Weft",
  question: "What destination does the saved reel transcript give for the stage, and does it establish that Lumen Weft personally promised to pay for transport?",
  savedAnswer: "The transcript says the portable stage is going to the east hall, not the courtyard, though the speaker is unverified. [1] No, it doesn't establish that Lumen Weft promised to pay: a voice says \"I will fund the transport myself,\" but the transcript doesn't verify who that voice is. [1]",
  illustrativeAnswer: "An unidentified voice says the stage is going to the east hall, not the courtyard. [1] A different unidentified voice says they will pay for transport. [1] The transcript identifies neither as Lumen Weft, so it doesn’t establish a personal promise from the artist. [1]",
  sources: [{
    n: 1,
    title: "Lumen Weft reel transcript",
    url: "https://www.instagram.com/reel/MN1424_HELDOUT_11/",
    sourceId: "vault:627bcc27-390f-5789-8a44-7cd8b2fe0ea8",
    revision: "3d47af8b59ec43f9b4f9f2f33200ff819daf62d163538a6b4c7bfdd0564b1dda",
    start: 0,
    curation: "approved",
    text: "Retained provider transcript for an Instagram reel on the fictional Lumen Weft account. [00:04, voice A, identity unverified] The portable stage is going to the east hall, not the courtyard. [00:11, voice B, identity unverified] I will fund the transport myself. The transcription has no verified speaker identification; posting account ownership does not establish who either voice belongs to.",
  }],
  followUp: "What else does the transcript establish?",
  followUpAnswer: "It records two statements: one voice gives the east hall as the stage destination, and another offers to fund transport. Neither voice is identified. [1]",
};

const CASES = [H09, H11, H05];

function makeInitialTurn(item: ReplayCase) {
  return {
    id: `synthetic-${item.id}`,
    question: item.question,
    answer: item.illustrativeAnswer,
    sources: item.sources.map(source => ({
      n: source.n,
      title: source.title,
      url: source.url,
      sourceId: source.sourceId,
      revision: source.revision,
      start: source.start,
      curation: source.curation,
    })),
    mentions: [],
    instagramMentions: [],
    songs: [],
    bandcamp: null,
    fromOpenWeb: false,
    webDomains: [],
  };
}

function SyntheticReplay({ item }: { item: ReplayCase }) {
  const researchRunner = useCallback<typeof runArtistResearch>(async input => {
    if (input.question.trim() !== item.followUp) {
      return { answer: "This synthetic replay only supports the suggested follow-up. No live research was run.", sources: [], suggestions: [item.followUp] };
    }
    return {
      answer: item.followUpAnswer,
      sources: item.sources.map(source => ({
        n: source.n,
        title: source.title,
        url: source.url,
        sourceId: source.sourceId,
        revision: source.revision,
        start: source.start,
        curation: source.curation,
      })),
      suggestions: [],
      mentions: [],
      instagramMentions: [],
      songs: [],
      bandcamp: null,
      fromOpenWeb: false,
      webDomains: [],
    };
  }, [item]);
  const sourceReader = useCallback<typeof readSourceDetails>(async (_artistId, source) => {
    const match = item.sources.find(candidate => candidate.sourceId === source.sourceId && candidate.revision === source.revision);
    if (!match) throw new Error("This synthetic source is unavailable.");
    return { text: match.text, url: match.url };
  }, [item]);

  const initialTurns = useMemo(() => [makeInitialTurn(item)], [item]);
  const initialSuggestions = useMemo(() => [item.followUp], [item]);

  return <AskAboutArtist
    artistId={item.artistId}
    artistName={item.artistName}
    answerDisclosure="Manual synthetic illustration · no live research"
    researchRunner={researchRunner}
    sourceReader={sourceReader}
    initialTurns={initialTurns}
    initialSuggestions={initialSuggestions}
  />;
}

export default function ChatFlow1424Preview() {
  const [selectedId, setSelectedId] = useState("H09");
  const item = CASES.find(candidate => candidate.id === selectedId) ?? H09;
  return <main className="mx-auto min-h-screen w-full max-w-2xl space-y-5 bg-neutral-950 px-4 py-6 text-white sm:py-10">
    <header className="rounded-2xl border border-amber-300/40 bg-amber-950/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">Synthetic replay · no live research</p>
      <h1 className="mt-1 text-xl font-semibold">Ask about an artist · phone review</h1>
      <p className="mt-2 text-sm leading-relaxed text-white/75">This preview renders saved fixture evidence through the real chat UI. Answers below are manual illustrations, not product-generated results. Follow-ups use a local fixture response.</p>
    </header>

    <nav aria-label="Review example" className="flex gap-2 overflow-x-auto pb-1">
      {CASES.map(candidate => <button key={candidate.id} type="button" aria-pressed={selectedId === candidate.id}
        onClick={() => setSelectedId(candidate.id)}
        className="min-h-11 shrink-0 rounded-xl border border-white/20 px-4 text-sm aria-pressed:border-pastypink aria-pressed:bg-pastypink/15">
        {candidate.id} · {candidate.artistName}
      </button>)}
    </nav>

    <section aria-label={`${item.id} answer comparison`} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <h2 className="text-sm font-semibold">{item.id} · {item.artistName}</h2>
      <p className="text-sm leading-relaxed">{item.question}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-white/50">Saved answer</p>
          <p className="mt-1 text-sm leading-relaxed text-white/75">{item.savedAnswer}</p>
        </div>
        <div className="rounded-xl border border-pastypink/25 bg-pastypink/[0.05] p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-pastypink">Illustrative rewrite · manual</p>
          <p className="mt-1 text-sm leading-relaxed text-white/90">{item.illustrativeAnswer}</p>
        </div>
      </div>
    </section>

    <section aria-label="Rendered chat preview" className="flex h-[min(68vh,42rem)] min-h-[32rem] flex-col overflow-hidden rounded-2xl border border-white/15 bg-neutral-950/90 shadow-xl">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold">Rendered chat · {item.artistName}</h2>
        <p className="mt-1 text-xs text-white/55">Select “Read passage” to inspect the exact synthetic original.</p>
      </div>
      <div className="min-h-0 flex-1 p-3 [&>div]:h-full">
        <SyntheticReplay key={item.id} item={item} />
      </div>
    </section>
  </main>;
}

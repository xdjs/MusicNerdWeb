"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

interface AskAboutArtistProps {
    artistId: string;
    artistName: string;
}

const DEFAULT_SUGGESTIONS = (name: string) => [
    `How did ${name} get started?`,
    `What's ${name}'s latest project?`,
    `Who has ${name} collaborated with?`,
    `What is ${name} known for?`,
];

type AnswerSource = { n: number; title: string; url: string };
type AnswerMention = { name: string; artistId?: string; instagram?: string; role?: string };
type AnswerSong = { title: string; spotifyUrl: string; kind?: string };
type TrackLink = { service: string; url: string };

/** A pill has room for where it ran, not for a headline. The full title is the
 *  hover.
 *
 *  Except when every source is the same site. An answer about what an artist has
 *  been doing lately cites a dozen of their own posts, and twelve pills reading
 *  "instagram.com" tell a reader nothing and look like a bug. The titles carry
 *  the date — "Pete Rango on Instagram, 2026-03-23" — so the pill shows that
 *  instead, and the reader can see which one is the recent one. */
function sourceHost(s: AnswerSource): string {
    // The artist answering a question we asked. There is no page to send
    // anyone to, and saying so beats showing a truncated question.
    if (!s.url) return "their own words";
    const dated = s.title.match(/\b(\d{4})-(\d{2})-\d{2}\b/);
    let host: string;
    try { host = new URL(s.url).hostname.replace(/^www\./, ""); }
    catch { return s.title.slice(0, 32); }
    if (!dated) return host;
    const month = MONTHS[Number(dated[2]) - 1];
    return month ? `${host} · ${month} ${dated[1]}` : host;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];


/**
 * Render an answer: its people, its records, and its citations.
 *
 * ONE PASS, NOT THREE. Mentions, song titles and citation markers all want to
 * replace spans of the same string, and running them in sequence means the
 * second pass matches inside what the first produced — a citation marker inside
 * a linked title, a name inside a bracket. So every candidate span is collected
 * with its position, overlaps are resolved by taking the earliest, and the text
 * is emitted once.
 *
 * WHO IS LINKABLE IS THE SERVER'S DECISION and this only renders it. That split
 * matters: the resolver returns credited collaborators and artists whose name
 * identifies exactly one person in the directory — never a name lifted out of a
 * story, because linking someone who died to whoever holds a matching handle is
 * a mistake you only make once.
 */
function renderAnswer(
    text: string,
    mentions: AnswerMention[],
    songs: AnswerSong[],
    sources: AnswerSource[],
    bandcamp: string | null,
    artistName: string,
): React.ReactNode {
    type Span = { start: number; end: number; node: (key: string) => React.ReactNode };
    const spans: Span[] = [];
    const escape = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const byNumber = new Map(sources.map(s => [s.n, s]));

    // CITATIONS. The model writes "[4]", "[11, 18, Artist Doc]" and sometimes
    // "[2026-05-13]". Only the numbers are citations, and only numbers we have a
    // source for are links.
    //
    // "[Artist Doc]" is the label on the one context block handed to the model
    // unnumbered, so it invents that marker for anything it read there. There is
    // no source behind it and never can be — the document has no public URL — so
    // it is dropped rather than shown. A reader was seeing an internal variable
    // name in the middle of a sentence.
    for (const m of text.matchAll(/\[([^\]]{1,60})\]/g)) {
        const body = m[1];
        if (/\d{4}-\d{2}/.test(body)) continue;                     // a date, not a citation
        const nums = body.split(",").map(p => Number(p.trim())).filter(n => Number.isInteger(n) && n > 0);
        const cited = nums.map(n => byNumber.get(n)).filter((x): x is AnswerSource => !!x);
        // A bracket with nothing citable in it disappears entirely, which covers
        // "[Artist Doc]" and a number for a source the answer did not end up
        // carrying.
        const at = m.index ?? 0;
        spans.push({
            start: at,
            end: at + m[0].length,
            node: key => cited.length === 0 ? null : (
                <sup key={key} className="ml-0.5 text-[0.65em] font-medium">
                    {cited.map((c, i) => (
                        <span key={c.n}>
                            {i > 0 && <span className="text-white/50">,</span>}
                            {c.url ? (
                                <a
                                    href={c.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={c.title}
                                    className="px-[0.15em] text-pastypink hover:underline"
                                >
                                    {c.n}
                                </a>
                            ) : (
                                // The artist told us this directly. Nowhere to
                                // link to, and a link that goes nowhere is
                                // worse than a number that admits it.
                                <span title={c.title} className="px-[0.15em] text-pastypink">
                                    {c.n}
                                </span>
                            )}
                        </span>
                    ))}
                </sup>
            ),
        });
    }

    // RECORDS. Matched on the title the server proved is theirs, on word
    // boundaries and allowing whatever punctuation the writer used between the
    // words — the same rule the server applies, so the two cannot disagree
    // about which spans are records. Without the boundaries a catalogue
    // containing "rush" turned the "rush" inside "rushing" into a button.
    for (const song of songs) {
        // Unicode-aware and identical to the server's rule, so the two cannot
        // disagree about which spans are records. \b is ASCII-only, so the
        // edges are asserted as "not a letter or digit" instead.
        const tokens = song.title.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
        if (tokens.length === 0) continue;
        const re = new RegExp(
            `(?<![\\p{L}\\p{N}])${tokens.map(escape).join("[^\\p{L}\\p{N}]+")}(?![\\p{L}\\p{N}])`,
            "giu",
        );
        for (const m of text.matchAll(re)) {
            const at = m.index ?? 0;
            spans.push({
                start: at,
                end: at + m[0].length,
                node: key => (
                    <SongLink key={key} label={m[0]} song={song} artistName={artistName} bandcamp={bandcamp} />
                ),
            });
        }
    }

    // PEOPLE. Longest first so "Dame Atlas" wins over "Dame".
    const ordered = [...mentions].sort((a, b) => b.name.length - a.name.length);
    for (const person of ordered) {
        const href = person.artistId
            ? `/artist/${person.artistId}`
            : person.instagram ? `https://www.instagram.com/${person.instagram}/` : null;
        if (!href) continue;
        // \b is ASCII-only: "Beyoncé\b" asserts a boundary after é, which is not
        // a word character to \b, so the name never matched and the person went
        // unlinked. Asserted as "not followed by a letter or digit" instead,
        // which is the same rule the record matcher uses.
        const re = new RegExp(`@?${escape(person.name)}(?![\\p{L}\\p{N}])`, "giu");
        for (const m of text.matchAll(re)) {
            const at = m.index ?? 0;
            spans.push({
                start: at,
                end: at + m[0].length,
                node: key => (
                    <a
                        key={key}
                        href={href}
                        {...(person.artistId ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                        className="underline decoration-dotted underline-offset-2 hover:decoration-solid"
                        title={person.role ? `${person.name} — ${person.role}` : person.name}
                    >
                        {m[0]}
                    </a>
                ),
            });
        }
    }

    if (spans.length === 0) return text;

    // Earliest wins, and anything overlapping it is dropped — a name inside a
    // record's title is the title, not a second link.
    spans.sort((a, b) => a.start - b.start || b.end - a.end);
    const out: React.ReactNode[] = [];
    let cursor = 0;
    let key = 0;
    for (const span of spans) {
        if (span.start < cursor) continue;
        if (span.start > cursor) out.push(text.slice(cursor, span.start));
        out.push(span.node(`s${key++}`));
        cursor = span.end;
    }
    if (cursor < text.length) out.push(text.slice(cursor));
    return out;
}

/**
 * The same icons the Links row on this page uses, so the menu reads as part of
 * the profile rather than a stray dropdown.
 *
 * Apple Music has no icon in `public/siteIcons`, and adding a platform logo is
 * an asset decision rather than a styling one — so a service without an icon
 * gets a lettered chip in the same circle. It looks deliberate next to the
 * others instead of leaving a hole.
 */
/** "Bandcamp (artist page)" -> { name, caveat }. Parsed in ONE place: the icon
 *  lookup and the label both needed it, and two copies meant the assumption
 *  that a parenthetical always closes was made twice. */
function parseServiceLabel(service: string): { name: string; caveat: string | null } {
    const open = service.indexOf(" (");
    if (open === -1) return { name: service, caveat: null };
    const close = service.lastIndexOf(")");
    return {
        name: service.slice(0, open),
        caveat: close > open ? service.slice(open + 2, close) : service.slice(open + 2),
    };
}

const SERVICE_ICON: Record<string, string> = {
    Spotify: "/siteIcons/spotify_icon.svg",
    Deezer: "/siteIcons/deezer_icon.svg",
    Bandcamp: "/siteIcons/bandcamp_icon.svg",
};

function ServiceIcon({ service }: { service: string }) {
    // "Bandcamp (artist page)" carries its caveat in the label; the icon lookup
    // wants the bare name.
    const src = SERVICE_ICON[parseServiceLabel(service).name];
    return (
        <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 shadow-sm transition-colors group-hover/opt:bg-white/20">
            {src
                ? <img src={src} alt="" className="h-6 w-6 object-contain" />
                : <span className="text-sm font-semibold text-white/70">{service.slice(0, 1)}</span>}
        </span>
    );
}

/**
 * A record, and everywhere you can hear it.
 *
 * Opens on click rather than resolving up front: two provider lookups per song,
 * on an answer naming three of them, is most of a second added to every question
 * for links most readers never open.
 *
 * Spotify is always there, because that is where the title was proved to be
 * this artist's in the first place. Apple Music and Deezer are searched live.
 * Bandcamp is offered as the ARTIST's page and labelled as such — they have no
 * API, so we genuinely do not know whether this particular record is on it, and
 * a "buy this song" link that lands on a different one is worse than an honest
 * one that lands on their store.
 */
function SongLink({
    label, song, artistName, bandcamp,
}: {
    label: string;
    song: AnswerSong;
    artistName: string;
    bandcamp: string | null;
}) {
    const [open, setOpen] = useState(false);
    const [links, setLinks] = useState<TrackLink[] | null>(null);
    const [loading, setLoading] = useState(false);
    const box = useRef<HTMLSpanElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);

    /** Escape from inside the menu would otherwise unmount the focused link and
     *  drop focus to <body>, leaving a keyboard reader at the top of the page
     *  with no idea where they were. */
    const closeAndRestore = () => {
        setOpen(false);
        toggleRef.current?.focus();
    };

    useEffect(() => {
        if (!open) return;
        const away = (e: MouseEvent) => {
            if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
        };
        // More than one song menu can be opened with the keyboard because no
        // mousedown occurs to close the first. Escape belongs to the menu that
        // currently contains focus; letting every document listener handle it
        // closes all open menus and makes the last listener steal focus.
        const esc = (e: KeyboardEvent) => {
            if (e.key === "Escape" && box.current?.contains(e.target as Node)) closeAndRestore();
        };
        document.addEventListener("mousedown", away);
        document.addEventListener("keydown", esc);
        return () => {
            document.removeEventListener("mousedown", away);
            document.removeEventListener("keydown", esc);
        };
    }, [open]);

    const toggle = async () => {
        // Safari and Firefox on macOS do not consistently focus a button after
        // a pointer click. Taking focus explicitly makes the focused-menu
        // Escape rule work for mouse-opened menus too.
        toggleRef.current?.focus();
        const next = !open;
        setOpen(next);
        if (!next || links !== null || loading) return;
        setLoading(true);
        try {
            const q = new URLSearchParams({
                title: song.title,
                artist: artistName,
                // Albums and singles need different provider endpoints.
                kind: song.kind ?? "album",
            });
            const res = await fetch(`/api/trackLinks?${q}`);
            const data = await res.json();
            setLinks(Array.isArray(data.links) ? data.links : []);
        } catch {
            // An empty list, not an error state: Spotify is already on the menu
            // and a failed lookup should not take a working link away.
            setLinks([]);
        } finally {
            setLoading(false);
        }
    };

    const options: TrackLink[] = [
        { service: "Spotify", url: song.spotifyUrl },
        ...(links ?? []),
        ...(bandcamp ? [{ service: "Bandcamp (artist page)", url: bandcamp }] : []),
    ];

    return (
        <span className="relative inline-block" ref={box} data-song-menu-open={open}>
            <button
                ref={toggleRef}
                type="button"
                onClick={toggle}
                aria-expanded={open}
                className="underline decoration-dotted underline-offset-2 hover:decoration-solid text-left"
                title={`Where to hear ${song.title}`}
            >
                {label}
            </button>
            {open && (
                <span
                    // NOT role="dialog". The rest of the page stays live behind
                    // this, and none of the conventions a dialog promises —
                    // focus moved in, focus trapped, focus restored — were
                    // implemented. Announcing "dialog" and then doing none of it
                    // is worse for a screen reader than announcing nothing. A
                    // labelled group of links is what this actually is.
                    role="group"
                    aria-label={`Where to hear ${song.title}`}
                    className="absolute left-0 top-full z-30 mt-2 flex w-max max-w-[min(20rem,80vw)] flex-col gap-2 rounded-xl border border-white/15 bg-neutral-950/95 p-3 text-white shadow-xl backdrop-blur-xl"
                >
                    <span className="max-w-[16rem] truncate text-[11px] font-medium uppercase tracking-wide text-white/70">
                        Where to hear “{song.title}”
                    </span>
                    <span className="flex flex-wrap items-start gap-3">
                        {options.map(o => (
                            <a
                                key={o.service}
                                href={o.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group/opt flex w-16 flex-col items-center gap-1.5 no-underline"
                            >
                                <ServiceIcon service={o.service} />
                                {/* THE CAVEAT SURVIVES THE REDESIGN. "Bandcamp
                                    (artist page)" says it is their store and not
                                    this record, because Bandcamp has no API and
                                    we cannot claim more. Truncating that to
                                    "Bandcamp" under an icon would quietly turn an
                                    honest link into a false one, so the
                                    parenthetical becomes a second line rather
                                    than disappearing.

                                    KEPT IN BRACKETS. Two adjacent text nodes can
                                    be concatenated without a separator when the
                                    accessible name is computed — "Bandcampartist
                                    page" — and the brackets make the boundary
                                    part of the text rather than something the
                                    layout has to supply. */}
                                <span className="w-full text-center text-[11px] leading-tight text-white/70">
                                    {parseServiceLabel(o.service).name}
                                    {parseServiceLabel(o.service).caveat && (
                                        <span className="block text-[10px] leading-tight text-white/65">
                                            ({parseServiceLabel(o.service).caveat})
                                        </span>
                                    )}
                                </span>
                            </a>
                        ))}
                        {/* Same footprint as an option, so the row does not jump
                            when the lookup lands — the old menu grew a text line
                            underneath and shifted everything already rendered. */}
                        {loading && (
                            <span className="flex w-16 flex-col items-center gap-1.5" aria-live="polite">
                                <span className="h-10 w-10 animate-pulse rounded-full border border-white/40 bg-white/40 dark:border-white/15 dark:bg-white/10" />
                                <span className="w-full truncate text-center text-[11px] leading-tight text-white/70">
                                    Looking…
                                </span>
                            </span>
                        )}
                    </span>
                    {!loading && links?.length === 0 && options.length === 1 && (
                        <span className="text-[11px] text-white/70">Nowhere else we could find it.</span>
                    )}
                </span>
            )}
        </span>
    );
}

type ConversationTurn = {
    question: string;
    answer?: string;
    sources: AnswerSource[];
    mentions: AnswerMention[];
    songs: AnswerSong[];
    bandcamp: string | null;
    fromOpenWeb: boolean;
    webDomains: string[];
    error?: string;
};

function ConversationAnswer({ turn, artistName }: { turn: ConversationTurn; artistName: string }) {
    const { answer, sources, mentions, songs, bandcamp, fromOpenWeb, webDomains } = turn;
    return <div className="space-y-3 px-1">
        {/* Answer */}
        {answer && (
            <p data-testid="answer" className="text-sm text-white/90 leading-relaxed whitespace-pre-line break-words">
                {renderAnswer(answer, mentions, songs, sources, bandcamp, artistName)}
            </p>
        )}

        {/* Where it came from.
          *
          * "AI-generated response" tells a reader the least useful
          * true thing about an answer: how it was phrased, not
          * whether to believe it. The endpoint already reads the
          * artist's verified vault and their knowledge document as
          * ground truth, and it collected the source urls and then
          * dropped them one line before responding. Showing them is
          * the difference between a chatbot and a researched answer,
          * and it is what a reader needs in order to trust either. */}
        {answer && sources.length > 0 && (
            <div className="flex flex-col gap-1 pt-1">
                <p className="text-[10px] text-white/60">Sources</p>
                <div className="flex flex-wrap gap-1.5">
                    {sources.map(s => {
                        const label = (
                            <>
                                <span className="opacity-50">[{s.n}]</span>
                                {sourceHost(s)}
                            </>
                        );
                        const pill = "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-white/15 text-white/65 whitespace-nowrap max-w-[16rem] truncate";
                        return s.url ? (
                            <a
                                key={s.n}
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${pill} hover:border-white/30`}
                                title={s.title}
                            >
                                {label}
                            </a>
                        ) : (
                            <span key={s.n} className={pill} title={s.title}>{label}</span>
                        );
                    })}
                </div>
            </div>
        )}

        {/* Answered from the open web, because our own sources did
          * not cover it. Named as such: a reader has to be able to
          * tell "this is from the artist's own posts and their
          * vault" from "this is from a search". */}
        {answer && fromOpenWeb && (
            <div className="flex flex-col gap-1 pt-1">
                <p className="text-[10px] text-white/60">
                    Not in {artistName}&apos;s sources — answered from the web
                </p>
                {webDomains.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {webDomains.map(d => (
                            <span
                                key={d}
                                className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border border-dashed border-white/20 text-white/65 whitespace-nowrap"
                            >
                                {d}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        )}

        {answer && (
            <p className="text-[10px] text-white/50 italic">
                {sources.length > 0
                    ? "Written by AI from the sources above"
                    : fromOpenWeb
                        ? "Written by AI from a web search"
                        : "AI-generated response"}
            </p>
        )}
    </div>;
}

export default function AskAboutArtist({ artistId, artistName }: AskAboutArtistProps) {
    const [question, setQuestion] = useState("");
    const [turns, setTurns] = useState<ConversationTurn[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS(artistName));
    const [loading, setLoading] = useState(false);
    const requestPending = useRef(false);
    const askedQuestions = useRef<Set<string>>(new Set());
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const ask = async (q: string) => {
        const trimmed = q.trim();
        if (!trimmed || requestPending.current) return;
        requestPending.current = true;
        setLoading(true);
        setQuestion("");
        askedQuestions.current.add(trimmed.toLowerCase());
        const pending: ConversationTurn = {
            question: trimmed, sources: [], mentions: [], songs: [],
            bandcamp: null, fromOpenWeb: false, webDomains: [],
        };
        setTurns(previous => [...previous, pending]);
        const finish = (result: Partial<ConversationTurn>) => {
            setTurns(previous => [...previous.slice(0, -1), { ...pending, ...result }]);
        };
        try {
            const res = await fetch("/api/askArtist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ artistId, question: trimmed }),
            });
            const data = await res.json();
            if (!res.ok || data.error || typeof data.answer !== "string" || !data.answer.trim()) {
                finish({ error: typeof data.error === "string" ? data.error : "Something went wrong. Try again." });
                return;
            }
            finish({
                answer: data.answer,
                sources: Array.isArray(data.sources) ? data.sources : [],
                mentions: Array.isArray(data.mentions) ? data.mentions : [],
                songs: Array.isArray(data.songs) ? data.songs : [],
                bandcamp: typeof data.bandcamp === "string" ? data.bandcamp : null,
                fromOpenWeb: data.fromOpenWeb === true,
                webDomains: Array.isArray(data.webDomains) ? data.webDomains : [],
            });
            if (Array.isArray(data.suggestions)) {
                setSuggestions(data.suggestions.filter((s: string) =>
                    typeof s === "string" && !askedQuestions.current.has(s.toLowerCase())));
            }
        } catch {
            finish({ error: "Failed to get an answer. Try again." });
        } finally {
            requestPending.current = false;
            setLoading(false);
        }
    };

    useEffect(() => {
        // Scroll only the conversation, never the artist page behind it. Show
        // the latest question and the beginning of its answer, not its footnotes.
        const scroller = scrollRef.current;
        const latest = scroller?.querySelectorAll<HTMLElement>("[data-conversation-turn]");
        const lastTurn = latest?.[latest.length - 1];
        if (scroller && lastTurn) scroller.scrollTop = lastTurn.offsetTop;
    }, [turns]);

    return (
        <div className="flex min-h-0 flex-col">
            <div ref={scrollRef} role="log" aria-label="Questions and answers" aria-live="polite"
                className="relative min-h-0 overflow-y-auto overscroll-contain px-4 py-4 scrollbar-glass">
                {turns.length === 0 && <p className="mb-3 text-sm leading-relaxed text-white/75">What would you like to know about {artistName}?</p>}
                {turns.map((turn, index) => (
                    <div key={index} data-conversation-turn className="mb-5 space-y-4 last:mb-0">
                        <p className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-sm border border-pastypink/15 bg-pastypink/10 px-3 py-2 text-sm leading-relaxed text-white/90">{turn.question}</p>
                        {turn.error
                            ? <div role="alert" className="space-y-2 px-1"><p className="text-sm text-red-300">{turn.error}</p><button type="button" disabled={loading} onClick={() => ask(turn.question)} className="min-h-11 text-sm text-pastypink underline underline-offset-4">Try again</button></div>
                            : turn.answer ? <ConversationAnswer turn={turn} artistName={artistName} />
                                : <p role="status" className="flex items-center gap-2 px-1 text-sm text-white/60"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-pastypink motion-safe:animate-pulse" />Finding an answer…</p>}
                    </div>
                ))}
                {!loading && suggestions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {suggestions.filter(s => !askedQuestions.current.has(s.toLowerCase())).slice(0, 2).map(suggestion => (
                            <button key={suggestion} type="button" onClick={() => ask(suggestion)}
                                className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-xs font-medium text-white/70 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-pastypink">
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <form onSubmit={event => { event.preventDefault(); void ask(question); }} className="shrink-0 border-t border-white/10 p-3">
                <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] pl-3 pr-1 focus-within:border-pastypink/50 focus-within:ring-1 focus-within:ring-pastypink/20">
                    <input ref={inputRef} type="text" value={question} onChange={event => setQuestion(event.target.value)}
                        aria-label={`Ask anything about ${artistName}`}
                        placeholder={`Ask anything about ${artistName}...`} maxLength={500}
                        className="min-h-12 min-w-0 flex-1 border-0 bg-transparent py-3 text-base text-white/90 outline-none placeholder:text-white/45" />
                    <button type="submit" disabled={!question.trim() || loading} aria-label="Submit question"
                        className="button-pink flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pastypink text-black transition-opacity hover:opacity-90 disabled:opacity-30">
                        <ArrowUp size={20} aria-hidden="true" />
                    </button>
                </div>
            </form>
        </div>
    );
}

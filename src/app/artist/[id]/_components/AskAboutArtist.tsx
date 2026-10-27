"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { getAccessToken } from "@privy-io/react-auth";
import QuestionQuotaNotice from './QuestionQuotaNotice';
import { trackEvent } from '@/lib/analytics/trackEvent';
import { musicNerdApiUrl } from "@/lib/musicNerdApi/musicNerdApiUrl";
import { getChatProgress } from "@/lib/artistChat/getChatProgress";
import { getChatQuota } from "@/lib/artistChat/getChatQuota";
import { getChatSources, type ChatSource } from "@/lib/artistChat/getChatSources";
import { getMessageText } from "@/lib/artistChat/getMessageText";
import { getWebSearchUrls } from "@/lib/artistChat/getWebSearchUrls";
import { removeUnresolvedCitations } from "@/lib/artistChat/removeUnresolvedCitations";

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

/** A pill has room for where it ran, not for a headline. The full title is the
 *  hover.
 *
 *  Except when every source is the same site. An answer about what an artist has
 *  been doing lately cites a dozen of their own posts, and twelve pills reading
 *  "instagram.com" tell a reader nothing and look like a bug. The titles carry
 *  the date — "Pete Rango on Instagram, 2026-03-23" — so the pill shows that
 *  instead, and the reader can see which one is the recent one. */
function sourceHost(s: ChatSource): string {
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
 * Render an answer's citations. The model writes "[4]", "[11, 18, Artist Doc]"
 * and sometimes "[2026-05-13]". Only the numbers are citations, and only
 * numbers the stream sent a `source-url` part for are links.
 *
 * "[Artist Doc]" is a label the model can invent for context it read with no
 * number. There is no source behind it — the document has no public URL — so
 * it is dropped rather than shown. A reader was seeing an internal variable
 * name in the middle of a sentence.
 */
function renderAnswer(text: string, sources: ChatSource[]): React.ReactNode {
    const byNumber = new Map(sources.map(s => [s.n, s]));
    const out: React.ReactNode[] = [];
    let cursor = 0;
    for (const m of text.matchAll(/\[([^\]]{1,60})\]/g)) {
        const body = m[1];
        if (/\d{4}-\d{2}/.test(body)) continue;                     // a date, not a citation
        const at = m.index ?? 0;
        const cited = body.split(",").map(p => byNumber.get(Number(p.trim()))).filter((x): x is ChatSource => !!x);
        if (at > cursor) out.push(text.slice(cursor, at));
        cursor = at + m[0].length;
        // A bracket with nothing citable in it disappears entirely, which covers
        // "[Artist Doc]" and a number for a source the answer did not read.
        if (cited.length === 0) continue;
        out.push(
            <sup key={at} className="ml-0.5 text-[0.65em] font-medium">
                {cited.map((c, i) => (
                    <span key={c.n}>
                        {i > 0 && <span className="text-white/50">,</span>}
                        <a href={c.url} target="_blank" rel="noopener noreferrer" title={c.title}
                            className="px-[0.15em] text-pastypink hover:underline">{c.n}</a>
                    </span>
                ))}
            </sup>,
        );
    }
    if (cursor === 0) return text;
    if (cursor < text.length) out.push(text.slice(cursor));
    return out;
}

/** The answer ran the chat's web search: what it says came from outside the artist's saved sources. */
function searchedWeb(message: UIMessage): boolean {
    return message.parts.some(part => part.type === "tool-webSearch");
}

function ConversationAnswer({ message }: { message: UIMessage }) {
    const sources = getChatSources(message);
    const answer = removeUnresolvedCitations(getMessageText(message), new Set(sources.map(s => s.n)));
    const webUrls = getWebSearchUrls(message);
    const webSources = sources.filter(s => webUrls.has(s.url)).length;
    return <div className="space-y-3 px-1">
        <p data-testid="answer" className="text-sm text-white/90 leading-relaxed whitespace-pre-line break-words">
            {renderAnswer(answer, sources)}
        </p>

        {/* Where it came from. Showing the sources is the difference between a
          * chatbot and a researched answer, and it is what a reader needs in
          * order to trust either. */}
        {sources.length > 0 && (
            <div className="flex flex-col gap-1 pt-1">
                <p className="text-[10px] text-white/60">Sources</p>
                <div className="flex flex-wrap gap-1.5">
                    {sources.map(s => (
                        <a
                            key={s.n}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-white/15 text-white/65 whitespace-nowrap max-w-[16rem] truncate hover:border-white/30"
                            title={s.title}
                        >
                            <span className="opacity-50">[{s.n}]</span>
                            {sourceHost(s)}
                        </a>
                    ))}
                </div>
            </div>
        )}

        <p className="text-[10px] text-white/50 italic">
            {sources.length === 0
                ? "AI-generated response"
                : webSources === sources.length
                    ? "Written by AI from a web search"
                    : webSources > 0
                        ? "Written by AI from the sources above, including a web search"
                        : "Written by AI from the sources above"}
        </p>
    </div>;
}

/**
 * Ask about an artist: one streaming chat with MusicNerdAPI's
 * `POST /api/artist/{id}/chat` through `useChat`. The parts render as they
 * arrive: tool steps as the status line, then the answer's text with its `[n]`
 * citations against the streamed `source-url` parts. The Privy token rides in
 * the headers when signed in, so the hourly allowance counts per account;
 * signed out, the API counts it per IP. ArtistAskSheet keys this by artist, so
 * navigating to another profile starts a new chat.
 */
export default function AskAboutArtist({ artistId, artistName }: AskAboutArtistProps) {
    const [question, setQuestion] = useState("");
    const [stopped, setStopped] = useState(false);
    const [quotaNow, setQuotaNow] = useState(Date.now);
    const scrollRef = useRef<HTMLDivElement>(null);
    const transport = useMemo(() => new DefaultChatTransport({
        api: musicNerdApiUrl(`/api/artist/${encodeURIComponent(artistId)}/chat`),
        credentials: "omit",
        headers: async (): Promise<Record<string, string>> => {
            const token = await getAccessToken().catch(() => null);
            return token ? { Authorization: `Bearer ${token}` } : {};
        },
        // The endpoint takes `{ messages }` and nothing else.
        prepareSendMessagesRequest: ({ messages }) => ({ body: { messages } }),
    }), [artistId]);
    const { messages, sendMessage, status, stop, error, regenerate } = useChat({
        transport,
        onFinish: ({ message, isAbort, isError }) => {
            // A stopped stream is not an answer; a failed one is onError's.
            if (isAbort || isError) return;
            trackEvent('ask_question', { outcome: searchedWeb(message) ? 'open_web' : 'answered', sources: getChatSources(message).length });
        },
        onError: failure => {
            // A quota notice is not an answer either.
            if (!getChatQuota(failure)) trackEvent('ask_question', { outcome: 'error', sources: 0 });
        },
    });
    const busy = status === "submitted" || status === "streaming";
    const quota = getChatQuota(error);
    const turns = messages.flatMap((message, index) => message.role === "user"
        ? [{ question: message, answer: messages[index + 1]?.role === "assistant" ? messages[index + 1] : undefined }]
        : []);
    const asked = new Set(turns.map(turn => getMessageText(turn.question).toLowerCase()));
    const lastQuestion = getMessageText(turns.at(-1)?.question).toLowerCase();

    const isQuotaBlocked = (value: string, now: number) => !!quota
        && (!quota.resetAt || Date.parse(quota.resetAt) > now)
        && (quota.code !== 'research_quota' || lastQuestion === value.trim().toLowerCase());

    useEffect(() => {
        const now = Date.now();
        setQuotaNow(now);
        const reset = quota?.resetAt ? Date.parse(quota.resetAt) : 0;
        if (reset <= now) return;
        const timer = setInterval(() => {
            const current = Date.now();
            setQuotaNow(current);
            if (current >= reset) clearInterval(timer);
        }, 1000);
        return () => clearInterval(timer);
    }, [quota?.resetAt]);

    useEffect(() => {
        // Scroll only the conversation, never the artist page behind it. Show
        // the latest question and the beginning of its answer, not its footnotes.
        const scroller = scrollRef.current;
        const latest = scroller?.querySelectorAll<HTMLElement>("[data-conversation-turn]");
        const lastTurn = latest?.[latest.length - 1];
        if (scroller && lastTurn) scroller.scrollTop = lastTurn.offsetTop;
    }, [turns.length]);

    const ask = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed || busy || isQuotaBlocked(trimmed, Date.now())) return;
        setStopped(false);
        setQuestion("");
        void sendMessage({ text: trimmed });
    };
    const retry = () => { setStopped(false); void regenerate(); };

    return (
        <div className="flex min-h-0 flex-col">
            <div ref={scrollRef} role="log" aria-label="Questions and answers" aria-live="polite" aria-busy={busy}
                className="relative min-h-0 overflow-y-auto overscroll-contain px-4 py-4 scrollbar-glass">
                {turns.length === 0 && <p className="mb-3 text-sm leading-relaxed text-white/75">What would you like to know about {artistName}?</p>}
                {turns.map((turn, index) => {
                    const last = index === turns.length - 1;
                    return (
                        <div key={turn.question.id} data-conversation-turn className="mb-5 space-y-4 last:mb-0">
                            <p className="ml-auto w-fit max-w-[90%] [overflow-wrap:anywhere] rounded-2xl rounded-br-sm border border-pastypink/15 bg-pastypink/10 px-3 py-2 text-sm leading-relaxed text-white/90">{getMessageText(turn.question)}</p>
                            {last && quota
                                ? <QuestionQuotaNotice quota={quota} now={quotaNow}
                                    disabled={busy || isQuotaBlocked(lastQuestion, quotaNow)} onRetry={retry} />
                                : last && error
                                ? <div role="alert" className="space-y-2 px-1"><p className="text-sm text-red-300">Failed to get an answer. Try again.</p><button type="button" disabled={busy} onClick={retry} className="min-h-11 text-sm text-pastypink underline underline-offset-4">Try again</button></div>
                                : turn.answer && getMessageText(turn.answer) ? <ConversationAnswer message={turn.answer} />
                                : last && busy
                                ? <p role="status" className="flex items-center gap-2 px-1 text-sm text-white/60"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-pastypink motion-safe:animate-pulse" />{getChatProgress(turn.answer)}</p>
                                : last && stopped
                                ? <div className="space-y-2 px-1"><p className="text-sm text-white/70">Stopped. You can try again when ready.</p><button type="button" onClick={retry} className="min-h-11 text-sm text-pastypink underline underline-offset-4">Try again</button></div>
                                : null}
                        </div>
                    );
                })}
                {busy && <button type="button" className="min-h-11 text-sm text-white/70 underline underline-offset-4" onClick={() => { setStopped(true); void stop(); }}>Stop</button>}
                {!busy && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {DEFAULT_SUGGESTIONS(artistName).filter(s => !asked.has(s.toLowerCase())).slice(0, 2).map(suggestion => (
                            <button key={suggestion} type="button" disabled={isQuotaBlocked(suggestion, quotaNow)} onClick={() => ask(suggestion)}
                                className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-xs font-medium text-white/70 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-pastypink disabled:opacity-40">
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <form onSubmit={event => { event.preventDefault(); ask(question); }} className="shrink-0 border-t border-white/10 p-3">
                <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.04] pl-3 pr-1 focus-within:border-pastypink/50 focus-within:ring-1 focus-within:ring-pastypink/20">
                    <input type="text" value={question} onChange={event => setQuestion(event.target.value)}
                        aria-label={`Ask anything about ${artistName}`}
                        placeholder={`Ask anything about ${artistName}...`} maxLength={500}
                        className="min-h-12 min-w-0 flex-1 border-0 bg-transparent py-3 text-base text-white/90 outline-none placeholder:text-white/45" />
                    <button type="submit" disabled={!question.trim() || busy || isQuotaBlocked(question, quotaNow)} aria-label="Submit question"
                        className="button-pink flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-highlightpink text-black transition-colors hover:bg-highlightpink/80 active:bg-highlightpink/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlightpink focus-visible:ring-offset-2 disabled:opacity-30">
                        <ArrowUp size={20} aria-hidden="true" />
                    </button>
                </div>
            </form>
        </div>
    );
}

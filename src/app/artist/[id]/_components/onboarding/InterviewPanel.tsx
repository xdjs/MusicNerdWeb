"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    answerInterviewQuestion,
    finishInterview,
    markInterviewOffered,
    type InterviewQuestion,
} from "@/app/actions/interviewActions";

/**
 * Three questions, asked one at a time.
 *
 * The whole reason this exists: the auto-build gives an artist a finished page
 * in about forty seconds and asks them for nothing, so everything on it is
 * research. This is the only part of onboarding where what lands on the page
 * comes from them — and a search engine cannot do it.
 *
 * ONE AT A TIME, not a form. Three text boxes on a screen reads as homework and
 * gets abandoned at the first one; a single question with a Skip next to it
 * reads as a conversation and gets finished. It is also how the onboarding chat
 * already asked them, so the copy and the pacing are not new inventions.
 *
 * SKIP IS RECORDED, not ignored. A skipped question is written down with a null
 * answer so it is never asked again — without the row it comes back next time,
 * which is the nagging this design exists to avoid.
 */
export default function InterviewPanel({
    artistId,
    artistName,
    questions,
    reason,
    onClose,
}: {
    artistId: string;
    artistName: string;
    questions: InterviewQuestion[];
    reason: "first" | "new-material";
    onClose: () => void;
}) {
    const router = useRouter();
    const saving = useRef(false);
    const [index, setIndex] = useState(0);
    const [answer, setAnswer] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const [answered, setAnswered] = useState(0);

    // Written down the moment the panel opens, so a sitting abandoned by
    // closing the browser can be resumed rather than disappearing behind the
    // new-material gate.
    useEffect(() => {
        void markInterviewOffered(artistId, questions);
    }, [artistId, questions]);

    const current = questions[index];

    const advance = async (text: string | null) => {
        if (!current || saving.current) return;
        saving.current = true;
        setBusy(true);
        setError(null);
        const res = await answerInterviewQuestion({
            artistId,
            questionKey: current.key,
            question: current.question,
            answer: text,
            questions,
        }).catch(() => ({ success: false, error: "Could not save that. Please try again." }));
        if (!res.success) {
            setError(res.error ?? "Could not save that.");
            saving.current = false;
            setBusy(false);
            return;
        }
        if (text) {
            setAnswered(n => n + 1);
            // Latest reads answers directly from the database. Refresh after
            // each confirmed save, including a sitting closed after one answer.
            router.refresh();
        }
        setAnswer("");

        if (index + 1 < questions.length) {
            setIndex(index + 1);
            saving.current = false;
            setBusy(false);
            return;
        }
        // Keep the existing end-of-sitting About rebuild. Latest already
        // reflects each saved answer independently of this generation.
        const finished = await finishInterview(artistId).catch(() => ({ success: false }));
        if (finished.success) router.refresh();
        saving.current = false;
        setDone(true);
        setBusy(false);
    };

    return (
        <Dialog open onOpenChange={open => { if (!open && !saving.current) onClose(); }}>
            <DialogContent
                aria-busy={busy}
                onEscapeKeyDown={event => { if (saving.current) event.preventDefault(); }}
                onPointerDownOutside={event => { if (saving.current) event.preventDefault(); }}
                className="artist-link-panel max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border-white/15 bg-neutral-950/80 bg-gradient-to-br from-white/[0.08] via-transparent to-white/[0.02] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl backdrop-saturate-150 dark:bg-neutral-950/80 sm:rounded-2xl sm:p-6"
            >
                <DialogHeader className="space-y-2 pr-7 text-left">
                    <DialogTitle className="text-xl font-semibold leading-snug tracking-tight">
                        {done ? "Thank you" : reason === "new-material" ? "You've been busy" : "A few questions"}
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-relaxed text-white/60">
                        {done ? `Your interview with Music Nerd for ${artistName}.` : reason === "new-material"
                            ? "We noticed some new things. Three questions, skip any of them."
                            : "Three quick questions, in your own words. Skip any of them."}
                    </DialogDescription>
                </DialogHeader>

                {done ? (
                    <div className="mt-4 space-y-3">
                        <p className="text-sm text-white">
                            {answered > 0
                                ? "Your answers are saved. Find them in Latest, under In their words."
                                : "No problem. We'll ask again when you've got something new going on."}
                        </p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full rounded-xl bg-pastypink py-2.5 text-sm font-semibold text-black"
                        >
                            Done
                        </button>
                    </div>
                ) : current ? (
                    <div className="mt-4 space-y-3">
                        <p className="text-xs text-white/60">
                            {index + 1} of {questions.length}
                        </p>
                        <label htmlFor="interview-answer" className="block break-words text-sm font-medium text-white/90">{current.question}</label>
                        {/* THE POST IT CAME FROM.
                          *
                          * These questions are about things the artist wrote,
                          * sometimes years ago — "your cousin André handed you
                          * 112's Part III and Dr. Dre's 2001" is precise and
                          * still may not be placeable from memory. Pete, on his
                          * own interview: "I may not remember at that moment."
                          *
                          * Only shown when there is one. The static bank has no
                          * post behind it; a RESUMED question does, recovered
                          * from its stored key by `sourceUrlsForQuestionKeys`.
                          * This comment used to say resumed questions had none,
                          * which was true for about an hour and would have sent
                          * the next reader looking for a bug that was not
                          * there. */}
                        {current.sourceUrl && (
                            <a
                                href={current.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-white/60 underline underline-offset-2 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastypink"
                            >
                                <ExternalLink size={11} />
                                {current.key.startsWith("profile_") ? "View the source behind this question" : "See the post this came from"}
                            </a>
                        )}
                        <textarea
                            id="interview-answer"
                            disabled={busy}
                            value={answer}
                            onChange={e => setAnswer(e.target.value)}
                            rows={4}
                            maxLength={2000}
                            placeholder="However you'd say it."
                            className="w-full rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastypink/60 disabled:opacity-50"
                        />
                        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => advance(answer)}
                                disabled={busy || answer.trim().length === 0}
                                className="flex-1 rounded-xl bg-pastypink py-2.5 text-sm font-semibold text-black transition-colors hover:bg-pastypink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40"
                            >
                                {busy ? <span role="status" className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" aria-hidden="true" />Saving…</span> : "Send"}
                            </button>
                            {/* Written down as a skip, so it is never asked again. */}
                            <button
                                type="button"
                                onClick={() => advance(null)}
                                disabled={busy}
                                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastypink disabled:opacity-40"
                            >
                                Skip
                            </button>
                        </div>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

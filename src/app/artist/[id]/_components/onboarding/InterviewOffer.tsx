"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { MessageCircleQuestion, Clock3 } from "lucide-react";
import { EditModeContext } from "@/app/_components/EditModeContext";
import { markInterviewOffered, answerInterviewQuestion, finishInterview, getInterviewInvite, type InterviewInvite, type InterviewQuestion } from "@/app/actions/interviewActions";
import InterviewPanel from "./InterviewPanel";
import { TOUR_FINISHED_EVENT } from "./ProfileTour";

import type { InterviewTransport } from "@/lib/interview/interviewTransport";
const defaultTransport: InterviewTransport = { invite: getInterviewInvite, offered: markInterviewOffered, answer: answerInterviewQuestion, finish: finishInterview };

/** Return visits remain opt-in. Pausing retains offered rows; only Skip declines. */
export default function InterviewOffer({
    artistId,
    artistName,
    transport = defaultTransport,
}: {
    artistId: string;
    artistName: string;
    transport?: InterviewTransport;
}) {
    const { canEdit } = useContext(EditModeContext);
    const [questions, setQuestions] = useState<InterviewQuestion[] | null>(null);
    const [reason, setReason] = useState<"first" | "new-material">("first");
    const [resuming, setResuming] = useState(false);
    const [draftScope, setDraftScope] = useState<string>();
    const [pausing, setPausing] = useState(false);
    const pauseRef = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const openRef = useRef(false);
    const [dismissed, setDismissed] = useState(false);
    const dismissedRef = useRef(false);

    /** One in-flight request, shared. The mount check and the tour-finished
     *  check used to run concurrently: the tour's could open the panel with one
     *  set of questions while the older one resolved afterwards and replaced
     *  the `questions` prop underneath it — changing the question being
     *  answered, and recording both sets as offered. */
    const inFlight = useRef<Promise<InterviewInvite> | null>(null);

    const check = useCallback(async () => {
        if (dismissedRef.current) return null;
        if (!inFlight.current) {
            inFlight.current = transport.invite(artistId)
                .catch(() => ({ show: false }) as InterviewInvite)
                .finally(() => { inFlight.current = null; });
        }
        const invite = await inFlight.current;
        if (!invite.show || dismissedRef.current) return null;
        // Never while they are answering.
        if (openRef.current) return invite;
        setQuestions(invite.questions);
        setReason(invite.reason);
        setResuming(!!invite.resuming);
        setDraftScope(invite.draftScope);
        return invite;
    }, [artistId, transport]);

    // The returning case. Costs one query on an owner's own page and nothing at
    // all for a visitor.
    useEffect(() => {
        if (!canEdit) return;
        void check();
    }, [canEdit, check]);

    // The end-of-tour case. Asked again rather than reusing what the mount
    // fetched, because the build that preceded the tour may have produced the
    // very material this is grounded in.
    useEffect(() => {
        if (!canEdit) return;
        const onFinished = async (e: Event) => {
            if ((e as CustomEvent).detail !== artistId || dismissedRef.current) return;
            const invite = await check();
            if (invite?.show && !invite.resuming) { openRef.current = true; setOpen(true); }
        };
        window.addEventListener(TOUR_FINISHED_EVENT, onFinished);
        return () => window.removeEventListener(TOUR_FINISHED_EVENT, onFinished);
    }, [artistId, canEdit, check]);

    if (!canEdit || !questions || questions.length === 0) return null;

    if (open) {
        return (
            <InterviewPanel
                artistId={artistId}
                artistName={artistName}
                questions={questions}
                reason={reason}
                resuming={resuming}
                draftScope={draftScope}
                transport={transport}
                onPause={remaining => {
                    dismissedRef.current = true;
                    openRef.current = false;
                    setOpen(false);
                    setQuestions(remaining);
                    setResuming(true);
                    setDismissed(true);
                }}
                onClose={() => {
                    dismissedRef.current = true;
                    openRef.current = false;
                    setOpen(false);
                    // Only a completed sitting reaches this callback.
                    setDismissed(true);
                }}
            />
        );
    }

    if (dismissed) return null;

    return (
        <div className="glass flex items-start gap-3 rounded-xl p-4">
            {resuming ? <Clock3 size={18} className="mt-0.5 shrink-0 text-pastypink" /> : <MessageCircleQuestion size={18} className="mt-0.5 shrink-0 text-pastypink" />}
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#111] dark:text-white">
                    {resuming ? "Your interview is waiting for you" : reason === "new-material"
                        ? "You've been busy — want to talk about it?"
                        : "Want to be interviewed by Music Nerd?"}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {resuming ? `${questions.length} ${questions.length === 1 ? "question" : "questions"} to come back to. Whenever you’re ready.` : reason === "new-material"
                        ? "Three questions about what you've put out since we last spoke."
                        : "Three questions. Everything on your page right now is research — this part would be you."}
                </p>
                <button
                    type="button"
                    disabled={pausing}
                    onClick={() => { openRef.current = true; setOpen(true); }}
                    className="mt-2 min-h-11 rounded-lg bg-pastypink px-3 py-1.5 text-xs font-semibold text-[#111]"
                >
                    {resuming ? "Continue interview" : "Start"}
                </button>
            </div>
            {!resuming && <button
                type="button"
                disabled={pausing}
                onClick={async () => {
                    if (pauseRef.current) return;
                    pauseRef.current = true;
                    setPausing(true);
                    setError(null);
                    const result = await transport.offered(artistId, questions).catch(() => ({success: false}));
                    if (result.success) { dismissedRef.current = true; setResuming(true); setDismissed(true); }
                    else setError("Could not save for later. Please try again.");
                    pauseRef.current = false;
                    setPausing(false);
                }}
                className="min-h-11 shrink-0 rounded-lg px-2 text-xs text-gray-500 hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10"
            >
                {pausing ? "Saving…" : "Not now"}
            </button>}
            {error && <p role="alert" className="text-xs text-red-600 dark:text-red-300">{error}</p>}
        </div>
    );
}

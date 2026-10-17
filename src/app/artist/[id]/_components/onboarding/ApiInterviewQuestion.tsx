"use client";
import type { SessionQuestion } from "@/lib/interviewApi/sessionSchemas";
import type { InterviewRequest } from "@/lib/interviewApi/interviewRequestSchema";
import ApiInterviewEvidence from "./ApiInterviewEvidence";
/** One clear question; a failed save keeps the artist's unsent words in the textarea. */
export default function ApiInterviewQuestion({
  question,
  answer,
  onAnswerChange,
  busy,
  onAnswer,
  call,
}: {
  question: SessionQuestion;
  answer: string;
  onAnswerChange: (answer: string) => void;
  busy: boolean;
  onAnswer: (answer: string | null) => Promise<boolean>;
  call: (body: InterviewRequest) => Promise<unknown>;
}) {
  const button =
    "min-h-11 rounded-xl border border-input bg-black/[0.03] px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-black/5 dark:border-white/20 dark:bg-white/5 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pastypink disabled:opacity-40";
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground dark:text-white/60">{question.ordinal} of 3</p>
      <p className="text-base leading-relaxed">{question.question}</p>
      {question.references.map((ref, i) => (
        <ApiInterviewEvidence key={i} reference={ref} call={call} />
      ))}
      <label
        className="block text-sm font-medium"
        htmlFor={`answer-${question.id}`}
      >
        Your answer
      </label>
      <textarea
        id={`answer-${question.id}`}
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
        maxLength={8000}
        rows={4}
        disabled={busy}
        className="w-full resize-y rounded-xl border border-input bg-black/[0.02] p-3 text-base sm:text-sm leading-relaxed text-foreground dark:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pastypink/60 disabled:opacity-50"
      />
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {answer.length.toLocaleString()} / 8,000 characters
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-11 rounded-xl button-pink bg-highlightpink px-4 py-2.5 text-sm font-semibold text-[#111] transition-colors hover:bg-highlightpink/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pastypink disabled:opacity-40"
          disabled={busy || !answer.trim()}
          onClick={() => void onAnswer(answer)}
        >
          Save answer
        </button>
        <button
          type="button"
          className={button}
          disabled={busy}
          onClick={() => void onAnswer(null)}
        >
          Skip question
        </button>
      </div>
    </div>
  );
}

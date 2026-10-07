"use client";
import { useState } from "react";
import type { SessionQuestion } from "@/lib/interviewApi/sessionSchemas";
import type { InterviewRequest } from "@/lib/interviewApi/interviewRequestSchema";
import ApiInterviewEvidence from "./ApiInterviewEvidence";
/** One clear question; a failed save keeps the artist's unsent words in the textarea. */
export default function ApiInterviewQuestion({
  question,
  busy,
  onAnswer,
  call,
}: {
  question: SessionQuestion;
  busy: boolean;
  onAnswer: (answer: string | null) => Promise<boolean>;
  call: (body: InterviewRequest) => Promise<unknown>;
}) {
  const [answer, setAnswer] = useState("");
  const button =
    "min-h-11 rounded-lg border border-black/15 px-4 py-2 text-sm disabled:opacity-50 dark:border-white/20";
  return (
    <div className="space-y-3">
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
        onChange={(e) => setAnswer(e.target.value)}
        maxLength={8000}
        rows={4}
        disabled={busy}
        className="w-full resize-y rounded-xl border border-black/20 bg-transparent p-3 text-sm leading-relaxed outline-offset-2 dark:border-white/25"
      />
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {answer.length.toLocaleString()} / 8,000 characters
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={button}
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

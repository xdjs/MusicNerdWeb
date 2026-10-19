import { z } from "zod";
/** Reject unbounded or private-memory-shaped inputs before model/API work. */
export const questionRequestSchema = z.object({
  artistId: z.string().uuid(),
  question: z.string().trim().min(1).max(500),
  jobId: z.string().uuid().optional(),
  conversation: z.array(z.object({
    question: z.string().trim().min(1).max(500),
    answer: z.string().trim().min(1).max(3000),
    sourceUrls: z.array(z.string().url().max(2048).refine(url => /^https?:\/\//i.test(url), "Only public web URL schemes are allowed")).max(3).optional(),
    sourceRefs: z.array(z.object({
      n: z.number().int().positive().max(24),
      url: z.string().url().max(2048).refine(url => /^https?:\/\//i.test(url), "Only public web URL schemes are allowed"),
    }).strict()).max(3).optional().superRefine((refs, ctx) => {
      if (!refs) return;
      if (new Set(refs.map(ref => ref.n)).size !== refs.length)
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Citation numbers must be unique" });
    }),
  }).strict().superRefine((turn, ctx) => {
    if (turn.sourceRefs && turn.sourceRefs.some(ref => !turn.sourceUrls?.includes(ref.url)))
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Citation URL must be in the public source list" });
  })).max(4).refine(turns => turns.reduce((n, turn) => n + turn.question.length + turn.answer.length + (turn.sourceUrls ?? []).reduce((size, url) => size + url.length, 0) + (turn.sourceRefs ?? []).reduce((size, ref) => size + ref.url.length + 12, 0), 0) <= 12000,
    "Conversation exceeds its context budget").optional(),
}).strict();

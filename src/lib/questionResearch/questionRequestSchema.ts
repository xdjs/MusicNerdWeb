import { z } from "zod";
/** Reject unbounded or private-memory-shaped inputs before model/API work. */
export const questionRequestSchema = z.object({
  artistId: z.string().uuid(),
  question: z.string().trim().min(1).max(500),
  jobId: z.string().uuid().optional(),
  conversation: z.array(z.object({
    question: z.string().trim().min(1).max(500),
    answer: z.string().trim().min(1).max(3000),
  }).strict()).max(4).refine(turns => turns.reduce((n, turn) => n + turn.question.length + turn.answer.length, 0) <= 12000,
    "Conversation exceeds its context budget").optional(),
}).strict();

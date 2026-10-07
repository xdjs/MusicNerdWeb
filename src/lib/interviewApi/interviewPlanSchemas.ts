import { z } from "zod";
const revision = z.string().regex(/^[a-f0-9]{64}$/);
export const interviewReferenceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("original"),
    sourceId: z.string().min(1).max(100),
    revision,
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
    quote: z.string().min(8).max(1600),
  }),
  z.object({
    kind: z.literal("answer"),
    entryId: z.string().min(1).max(100),
    revision,
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
    quote: z.string().min(8).max(1600),
  }),
]);
export const interviewAnchorSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("original"),
    sourceId: z.string().min(1).max(100),
    revision,
    quote: z.string().min(8).max(1600),
  }),
  z.object({
    kind: z.literal("answer"),
    entryId: z.string().min(1).max(100),
    revision,
    quote: z.string().min(8).max(1600),
  }),
]);
export type InterviewAnchor = z.infer<typeof interviewAnchorSchema>;
export const interviewAngleSchema = z.object({
  observation: z.string().min(1).max(500),
  intendedUnknown: z.string().min(1).max(300),
  rationale: z.string().min(1).max(500),
  connection: z.enum([
    "single_observation",
    "documented_connection",
    "open_comparison",
  ]),
  references: z.array(interviewAnchorSchema).min(1).max(3),
});
export const interviewPlanSchema = z.object({
  angles: z.array(interviewAngleSchema).min(1).max(3),
  selected: z.number().int().min(0).max(2),
  selectionReason: z.string().min(1).max(400),
});
export const interviewDraftSchema = z.object({
  question: z.string().min(10).max(500),
});
export const interviewCheckSchema = z.object({
  supported: z.boolean(),
  timeScopeSupported: z
    .boolean()
    .describe(
      "Every dated or relative-time factual premise preserves the period actually established by its original; an old/undated source does not establish the artist's current state.",
    ),
  faithfulToLatestAnswer: z.boolean(),
  respectsBoundaries: z.boolean(),
  novelAgainstHistory: z
    .boolean()
    .describe(
      "True when the question does not repeat a prior offered, answered or skipped question; an unresolved follow-up can be novel.",
    ),
  oneClearAsk: z.boolean(),
  reason: z.string().max(600),
});
export type InterviewReference = z.infer<typeof interviewReferenceSchema>;
export type InterviewAngle = z.infer<typeof interviewAngleSchema>;

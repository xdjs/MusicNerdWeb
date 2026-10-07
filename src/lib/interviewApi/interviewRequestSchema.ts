import { z } from "zod";
const uuid = z.string().uuid(),
  revision = z.string().regex(/^[a-f0-9]{64}$/);
export const interviewRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), requestId: uuid }).strict(),
  z.object({ action: z.literal("continue"), sessionId: uuid }).strict(),
  z
    .object({
      action: z.literal("answer"),
      answerId: uuid,
      expectedRevision: revision,
      answer: z
        .string()
        .min(1)
        .max(8000)
        .refine((s) => s.trim().length > 0)
        .nullable(),
    })
    .strict(),
  z.object({ action: z.literal("finish"), sessionId: uuid }).strict(),
  z
    .object({
      action: z.literal("boundary"),
      requestId: uuid,
      questionKey: z.string().min(1).max(500),
      wording: z
        .string()
        .min(1)
        .max(4000)
        .refine((s) => s.trim().length > 0),
      scope: z.enum(["sitting", "until_retracted"]),
    })
    .strict(),
  z
    .object({ action: z.literal("retract"), boundaryId: uuid, revision })
    .strict(),
  z.object({ action: z.literal("memory") }).strict(),
  z
    .object({
      action: z.literal("source"),
      sourceId: z.string().min(1).max(100),
      revision,
      start: z.number().int().nonnegative(),
    })
    .strict(),
]);
export type InterviewRequest = z.infer<typeof interviewRequestSchema>;

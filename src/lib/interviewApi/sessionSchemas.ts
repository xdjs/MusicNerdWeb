import { z } from "zod";
import { interviewReferenceSchema } from "./interviewPlanSchemas";
export const sessionQuestionSchema = z.object({
  id: z.string().uuid(),
  questionKey: z.string().min(1).max(500),
  question: z.string().min(1).max(8000),
  answer: z.string().nullable(),
  state: z.enum(["offered", "answered", "skipped"]),
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  sitting: z.number().int().positive(),
  offeredAt: z.string(),
  answerUpdatedAt: z.string(),
  ordinal: z.number().int().min(1).max(3).nullable(),
  references: z.array(interviewReferenceSchema).max(3),
});
export const interviewSessionStateSchema = z.object({
  status: z.literal("ok"),
  session: z
    .object({
      id: z.string().uuid(),
      sitting: z.number().int().positive(),
      state: z.enum(["active", "finished"]),
      createdAt: z.string(),
      closedAt: z.string().nullable(),
      questions: z.array(sessionQuestionSchema).max(3),
    })
    .nullable(),
  legacyOffers: z.array(sessionQuestionSchema).max(3),
});
export type SessionQuestion = z.infer<typeof sessionQuestionSchema>;
export type InterviewSessionState = z.infer<typeof interviewSessionStateSchema>;

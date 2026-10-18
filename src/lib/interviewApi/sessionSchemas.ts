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
export const interviewPreparationSchema = z.object({
  jobId: z.string().uuid().nullable().optional(),
  phase: z.enum(["preparing", "checking"]).optional(),
  readyCount: z.number().int().min(0).max(3).optional(),
  totalCount: z.number().int().min(0).max(3).optional(),
  status: z.enum(["idle", "pending", "running", "ready", "failed", "stale"]),
  errorCode: z.enum(["preparation_failed", "model_output_invalid", "timeout_or_cancelled", "external_outcome_unknown"]).nullable().optional(),
});
export const interviewSessionStateSchema = z.object({
  status: z.literal("ok"),
  session: z
    .object({
      id: z.string().uuid(),
      interviewInvalidated: z.boolean().optional(),
      needsPreparedBankResume: z.boolean().optional(),
      sitting: z.number().int().positive(),
      state: z.enum(["active", "finished"]),
      createdAt: z.string(),
      closedAt: z.string().nullable(),
      questions: z.array(sessionQuestionSchema).max(3),
    })
    .nullable(),
  legacyOffers: z.array(sessionQuestionSchema).max(3),
  preparation: interviewPreparationSchema.optional(),
  savedQuestion: sessionQuestionSchema.optional(),
});
export type SessionQuestion = z.infer<typeof sessionQuestionSchema>;
export type InterviewSessionState = z.infer<typeof interviewSessionStateSchema>;

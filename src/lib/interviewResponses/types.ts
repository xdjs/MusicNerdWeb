import { z } from "zod";

export const interviewResponseSchema = z.object({
  id: z.string(),
  questionKey: z.string(),
  question: z.string(),
  answer: z.string(),
  source: z.string(),
  sitting: z.number().nullable(),
  offeredAt: z.string().nullable(),
  answerUpdatedAt: z.string().nullable(),
  revision: z.string().regex(/^[a-f0-9]{64}$/),
});
export const responseListSchema = z.object({
  status: z.literal("ok"),
  responses: z.array(interviewResponseSchema),
  nextCursor: z.string().nullable(),
});
export const responseReadSchema = z.object({
  status: z.literal("ok"),
  response: interviewResponseSchema,
  isCurrent: z.boolean(),
});
export const responseVersionsSchema = z.object({
  status: z.literal("ok"),
  versions: z.array(
    z.object({
      response: interviewResponseSchema,
      savedAt: z.string().nullable(),
      note: z.string().nullable(),
      isCurrent: z.boolean(),
    }),
  ),
  nextCursor: z.string().nullable(),
});
export type InterviewResponse = z.infer<typeof interviewResponseSchema>;
export type ResponseVersion = z.infer<
  typeof responseVersionsSchema
>["versions"][number];

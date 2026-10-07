import { z } from "zod";
const revision = z.string().regex(/^[a-f0-9]{64}$/);
const field = z.object({
  name: z.enum(["question", "answer", "claim", "correction", "wording"]),
  text: z.string().nullable(),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  totalChars: z.number().int().nonnegative(),
  complete: z.boolean(),
});
export const memoryOutputSchemas = {
  page: z.object({
    status: z.literal("ok"),
    snapshotId: revision,
    sitting: z.number().int().positive(),
    latestAnswer: z.object({ entryId: z.string(), revision }).nullable(),
    totalEntries: z.number().int().min(0).max(5000),
    entries: z
      .array(
        z.object({
          entryId: z.string().max(100),
          revision,
          kind: z.enum(["latest_answer", "correction", "boundary"]),
          metadata: z.record(
            z.string(),
            z.union([z.string(), z.number(), z.null()]),
          ),
          fields: z.array(field).min(1).max(2),
        }),
      )
      .max(50),
    constraintsComplete: z.boolean(),
    budget: z.object({
      returnedChars: z.number().int().min(0).max(20000),
      nextCursor: z.string().max(4096).nullable(),
    }),
  }),
};

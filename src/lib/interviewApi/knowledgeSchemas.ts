// HTTP contracts mirrored from MusicNerdAPI; no database/research implementation is imported.
import { z } from "zod";

export const artistKnowledgeIdSchema = z.string().uuid();
export const sourceKindSchema = z.enum([
  "vault",
  "social_caption",
  "reel_transcript",
]);
export const knowledgeSourceIdSchema = z
  .string()
  .regex(/^(vault:[0-9a-f-]{36}|social:[0-9a-f-]{36}:(caption|transcript))$/)
  .refine((value) => z.string().uuid().safeParse(value.split(":")[1]).success);
export const knowledgeRevisionSchema = z.string().regex(/^[a-f0-9]{64}$/);
const limit = z.number().int().min(1).max(50).default(20);
const cursor = z.string().min(1).max(4096).optional();
export const knowledgeInputSchemas = {
  brief: z.strictObject({}),
  sources: z.strictObject({ limit, cursor, kind: sourceKindSchema.optional() }),
  search: z.strictObject({
    query: z.string().trim().min(1).max(500),
    limit: z.number().int().min(1).max(10).default(5),
    maxChars: z.number().int().min(1000).max(12000).default(6000),
    kind: sourceKindSchema.optional(),
  }),
  read: z.strictObject({
    sourceId: knowledgeSourceIdSchema,
    includeVersion: z.boolean().optional(),
    revision: knowledgeRevisionSchema,
    start: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0),
    maxChars: z.number().int().min(1000).max(20000).default(6000),
  }),
  history: z.strictObject({
    limit,
    cursor,
    maxChars: z.number().int().min(1000).max(20000).default(12000),
    kind: z.enum(["all", "answers", "corrections"]).default("all"),
    sitting: z.number().int().min(1).max(2_147_483_647).optional(),
  }),
  "research-status": z.strictObject({ limit, cursor }),
  refresh: z.strictObject({}),
} as const;

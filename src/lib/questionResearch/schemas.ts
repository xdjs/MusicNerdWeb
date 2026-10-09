import { z } from "zod";
const revision = z.string().regex(/^[a-f0-9]{64}$/);
const publicUrl = z
  .string()
  .url()
  .refine((v) => /^https?:\/\//.test(v));
const uuid = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
export const referenceSchema = z.object({
  sourceId: z
    .string()
    .regex(
      new RegExp(
        `^(?:(?:discovery|vault|public_answer):${uuid}|social:${uuid}:(?:caption|transcript)|latest:(?:spotify|deezer|inprocess):[a-f0-9]{64})$`,
        "i",
      ),
    ),
  revision,
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  text: z.string().max(12000),
  url: publicUrl,
  curation: z.enum(["approved", "pending"]),
  evidenceKind: z.enum(["original_text", "caption", "provider_transcript"]),
  speaker: z.enum(["not_applicable", "unverified"]),
  publishedAt: z.string().nullable(),
  activityDate: z.string().max(100).optional(),
  activityDateKind: z.enum(["release", "moment"]).optional(),
  retrievedAt: z.string().nullable(),
  truncated: z.boolean().nullable(),
});
export const researchStatusSchema = z.object({
  status: z.literal("ok"),
  outsideResearchReason: z.literal("quota").optional(),
  jobId: z.string().uuid(),
  stage: z.enum([
    "checking_saved",
    "searching",
    "reading",
    "transcribing",
    "waiting_provider",
    "complete",
    "unresolved",
    "failed",
    "cancelled",
  ]),
  provider: z
    .enum(["web", "page", "instagram", "instagram_reels", "tiktok", "x"])
    .nullable(),
  message: z.string().max(2000),
  updatedAt: z.string(),
  references: z.array(referenceSchema).max(6),
  limitations: z.array(z.string().max(2000)).max(30),
});
export const researchReadSchema = z.object({
  status: z.literal("ok"),
  passage: referenceSchema,
  totalChars: z.number().int().nonnegative(),
  nextStart: z.number().int().nonnegative().nullable(),
});
export const questionPlanSchema = z
  .object({
    topic: z.string().trim().min(3).max(160),
    evidenceNeed: z.enum([
      "reporting",
      "release_date",
      "credits",
      "social_caption",
      "spoken_content",
    ]),
    freshness: z.enum(["stored", "recent"]),
    retrieval: z.enum(["latest", "relevance"]).default("relevance"),
    resolvedQuestion: z.string().trim().min(1).max(500).optional(),
    targetUrl: publicUrl.nullable(),
    platform: z.enum(["instagram", "tiktok", "x", "inprocess", "spotify", "deezer"]).nullable(),
    fromDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    toDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
  })
  .strict();
export const answerDraftSchema = z.object({
  sentences: z
    .array(
      z.object({
        text: z.string().min(1).max(700),
        evidence: z
          .array(
            z.object({
              n: z.number().int().min(1).max(3),
              field: z.enum(["text", "publishedAt", "activityDate"]).default("text"),
              quote: z.string().min(4).max(1800),
            }),
          )
          .min(1)
          .max(3),
      }),
    )
    .max(4),
  unanswered: z.string().max(500).nullable(),
});
export const discoverySchema = z.object({
  id: z.string().uuid(),
  url: publicUrl,
  destination: z.enum(["lore", "link"]),
  platform: z.string().nullable(),
  identity: z.enum(["confirmed", "unresolved", "wrong_artist"]),
  curation: z.enum([
    "pending",
    "approved",
    "declined",
    "wrong_artist",
    "incorrect",
  ]),
  reason: z.string(),
  revision,
  title: z.string().nullable(),
  evidenceId: z.string().uuid(),
});
export const discoveriesSchema = z.object({
  status: z.literal("ok"),
  candidates: z.array(discoverySchema).max(50),
  nextCursor: z.string().uuid().nullable(),
});
export type ResearchReference = z.infer<typeof referenceSchema>;
export type ResearchStatus = z.infer<typeof researchStatusSchema>;
export type ResearchDiscovery = z.infer<typeof discoverySchema>;

// HTTP contracts mirrored from MusicNerdAPI; no database/research implementation is imported.
import { z } from "zod";
import {
  knowledgeRevisionSchema as revision,
  knowledgeSourceIdSchema as sourceId,
  sourceKindSchema,
} from "@/lib/interviewApi/knowledgeSchemas";

const nonnegative = z.number().int().min(0);
const timestamp = z.string().datetime({ offset: true }).nullable();
const coverage = z.strictObject({
  eligibleSources: nonnegative,
  readableSources: nonnegative,
  searchedSources: nonnegative,
  complete: z.boolean(),
  limitations: z.array(z.string()),
});
const budget = z.strictObject({
  returnedChars: nonnegative,
  truncated: z.boolean(),
  nextCursor: z.string().max(4096).nullable(),
});
const source = z.strictObject({
  sourceId,
  kind: sourceKindSchema,
  title: z.string().max(300).nullable(),
  titleTruncated: z.boolean(),
  description: z.string().max(600).nullable(),
  descriptionTruncated: z.boolean(),
  url: z.string().url().nullable(),
  revision,
  publishedAt: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    z.string().datetime({ offset: true }),
    z.null(),
  ]),
  ingestedAt: timestamp,
  uploadedAt: timestamp,
  eventDate: z.null(),
  originalSourceUrl: z.null(),
  provenance: z.strictObject({
    origin: z.enum([
      "vault_link",
      "vault_upload",
      "social_caption",
      "provider_transcript",
    ]),
    provider: z.string().nullable(),
    method: z.string().nullable(),
    speaker: z.enum(["not_applicable", "unverified", "verified"]),
    publisher: z.string().nullable(),
    speakerName: z.null(),
    relationship: z.literal("unknown"),
  }),
  extraction: z.strictObject({
    readiness: z.enum(["ready", "unknown"]),
    storedChars: nonnegative,
    truncated: z.boolean().nullable(),
    limitations: z.array(z.string()),
  }),
});
const passage = z.strictObject({
  source,
  revision,
  start: nonnegative,
  end: nonnegative,
  text: z.string(),
  page: z.null(),
  startSeconds: z.null(),
  endSeconds: z.null(),
});
const history = z.strictObject({
  entryId: z.string(),
  revision,
  kind: z.enum(["answer", "correction"]),
  questionKey: z.string().nullable(),
  answerState: z.enum(["answered", "skipped", "offered"]).nullable(),
  sitting: z.number().int().min(1).nullable(),
  offeredAt: timestamp,
  answerUpdatedAt: timestamp,
  source: z.string().nullable(),
  correctionKind: z.string().nullable(),
  fields: z
    .array(
      z.strictObject({
        field: z.enum(["question", "answer", "claim", "correction"]),
        text: z.string().nullable(),
        start: nonnegative,
        end: nonnegative,
        totalChars: nonnegative,
        complete: z.boolean(),
      }),
    )
    .min(1)
    .max(2),
});
const job = z.strictObject({
  extractionOutcomes: z.array(z.unknown()).max(20).optional(),
  jobId: z.string().uuid(),
  kind: z.enum([
    "social_ingest",
    "caption_extract",
    "lore_refresh",
    "source_search",
    "latest_refresh",
    "source_extract",
  ]),
  status: z.enum(["pending", "running", "done", "failed"]),
  cursor: nonnegative,
  total: nonnegative.nullable(),
  updatedAt: timestamp,
  errorCategory: z.string().nullable(),
});
export const knowledgeOutputSchemas = {
  brief: z.strictObject({
    status: z.literal("ok"),
    artistId: z.string().uuid(),
    name: z.string().nullable(),
    bio: z.string().nullable(),
    generatedLoreSummary: z.string().nullable(),
    summaryIsEvidence: z.literal(false),
    historyRequired: z.literal(true),
    coverage,
    returnedChars: nonnegative.max(6000),
    truncated: z.boolean(),
  }),
  sources: z.strictObject({
    status: z.literal("ok"),
    sources: z.array(source).max(50),
    coverage,
    budget,
  }),
  search: z.strictObject({
    status: z.literal("ok"),
    passages: z.array(passage).max(10),
    coverage,
    returnedChars: nonnegative.max(12000),
    truncated: z.boolean(),
  }),
  read: z.strictObject({
    version: z
      .discriminatedUnion("state", [
        z.strictObject({
          state: z.literal("current"),
          currentRevision: revision,
          capturedAt: z.null(),
        }),
        z.strictObject({
          state: z.literal("historical"),
          currentRevision: revision,
          capturedAt: z.string().datetime(),
        }),
      ])
      .optional(),
    status: z.literal("ok"),
    passage,
    totalChars: nonnegative,
    nextStart: nonnegative.nullable(),
    returnedChars: nonnegative.max(20000),
    truncated: z.boolean(),
  }),
  history: z.strictObject({
    status: z.literal("ok"),
    entries: z.array(history).max(50),
    budget,
    constraintsComplete: z.literal(false),
    memory: z.strictObject({
      boundaryState: z.literal("not_implemented"),
      latestAnswer: z
        .strictObject({ entryId: z.string(), revision })
        .nullable(),
    }),
    correctionsComplete: z.boolean(),
  }),
  "research-status": z.strictObject({
    status: z.literal("ok"),
    jobs: z.array(job).max(50),
    coverage,
    budget,
  }),
  refresh: z.strictObject({ status: z.literal("ok"), message: z.string() }),
} as const;

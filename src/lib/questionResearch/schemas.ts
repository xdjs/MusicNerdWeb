import { z } from "zod";
import { MAX_ORIGINAL_CHARACTERS } from "./limits";
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
  text: z.string().max(MAX_ORIGINAL_CHARACTERS),
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
export const researchReadSchema = z.object({
  status: z.literal("ok"),
  passage: referenceSchema,
  totalChars: z.number().int().nonnegative(),
  nextStart: z.number().int().nonnegative().nullable(),
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
export type ResearchDiscovery = z.infer<typeof discoverySchema>;

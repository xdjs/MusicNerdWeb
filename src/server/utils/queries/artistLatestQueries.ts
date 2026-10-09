import { eq, inArray, and } from "drizzle-orm";
import { db } from "@/server/db/drizzle";
import { artistInterviewAnswers } from "@/server/db/schema";
import { sourceUrlsForQuestionKeys } from "@/server/utils/questionGenerator";
import { latestExternalUrl } from "@/lib/artist/artistLatest";
import { z } from "zod";
import type { Artist } from "@/server/db/DbTypes";
import { MUSICNERD_API_URL } from "@/lib/musicNerdApi/const";
import {
  orderLatestItems,
  type ArtistLatestItem,
} from "@/lib/artist/artistLatest";
const url = z
  .string()
  .url()
  .refine((value) => {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password;
  });
const card = z.object({
  id: z.string().max(200),
  kind: z.enum(["release", "instagram", "interview", "moment"]),
  title: z.string().max(2000),
  text: z.string().max(30000),
  date: z.string().max(100),
  imageUrl: url.nullable(),
  imageCaption: z.string().max(2000),
  sourceUrl: url.nullable(),
  sourceLabel: z.string().max(200),
  imageDimensions: z
    .object({ width: z.number().positive(), height: z.number().positive() })
    .optional(),
  momentKind: z
    .enum(["video", "audio", "image", "writing", "other"])
    .optional(),
  listeningLinks: z
    .array(
      z.object({
        siteName: z.string(),
        href: url,
        label: z.string(),
        iconSrc: z.string(),
      }),
    )
    .max(10)
    .optional(),
});
const responseSchema = z.object({
  status: z.literal("ok"),
  items: z.array(card).max(30),
  unavailable: z.boolean(),
  coverage: z
    .array(
      z.object({
        provider: z.enum(["spotify", "deezer", "inprocess"]),
        status: z.enum(["checked", "failed", "missing", "disconnected"]),
        checkedAt: z.string().nullable(),
        lastAttemptAt: z.string().nullable(),
        stale: z.boolean(),
      }),
    )
    .max(3),
});
export interface ArtistLatestResult {
  items: ArtistLatestItem[];
  unavailable: boolean;
  coverage?: z.infer<typeof responseSchema>["coverage"];
}
/** Read shared API snapshots. Page views never contact catalogs or start research. */
export async function getArtistLatest(
  artist: Artist,
): Promise<ArtistLatestResult> {
  try {
    if (!z.string().uuid().safeParse(artist.id).success)
      throw new Error("Invalid artist");
    const origin = new URL(MUSICNERD_API_URL);
    if (
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash ||
      origin.username ||
      origin.password ||
      !(
        origin.protocol === "https:" ||
        (origin.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(origin.hostname))
      )
    )
      throw new Error("Invalid API origin");
    const response = await fetch(
      new URL(`/api/artist/${artist.id}/latest`, origin),
      {
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) throw new Error("Latest unavailable");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Latest unavailable");
    let bytes = 0;
    const chunks: Uint8Array[] = [];
    try {
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        bytes += part.value.length;
        if (bytes > 1000000) throw new Error("Latest too large");
        chunks.push(part.value);
      }
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
    const text = Buffer.concat(chunks).toString("utf8");
    const parsed = responseSchema.parse(JSON.parse(text));
    const answerCards = parsed.items.filter(
      (item) => item.kind === "interview",
    );
    if (answerCards.length) {
      try {
        const rows = await db
          .select({
            id: artistInterviewAnswers.id,
            questionKey: artistInterviewAnswers.questionKey,
          })
          .from(artistInterviewAnswers)
          .where(
            and(
              eq(artistInterviewAnswers.artistId, artist.id),
              inArray(
                artistInterviewAnswers.id,
                answerCards.map((item) => item.id.replace("interview:", "")),
              ),
            ),
          );
        const sources = await sourceUrlsForQuestionKeys(
          artist.id,
          rows.map((row) => row.questionKey),
        );
        for (const item of answerCards) {
          const row = rows.find((row) => `interview:${row.id}` === item.id);
          const original = row
            ? latestExternalUrl(sources.get(row.questionKey))
            : null;
          item.sourceUrl = original;
          item.sourceLabel = "View the source behind this answer";
          const post = parsed.items.find(
            (post) => post.kind === "instagram" && post.sourceUrl === original,
          );
          if (post) {
            item.imageUrl = post.imageUrl;
            item.imageDimensions = post.imageDimensions;
            item.imageCaption = "The post behind this answer";
          }
        }
      } catch {
        /* Missing optional attribution does not hide public activity. */
      }
    }
    return {
      items: orderLatestItems(parsed.items),
      unavailable: parsed.unavailable,
      coverage: parsed.coverage,
    };
  } catch {
    return { items: [], unavailable: true };
  }
}

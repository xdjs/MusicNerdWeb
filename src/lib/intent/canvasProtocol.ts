import { z } from "zod";
import seed from "./seed.json";
import dutchSeed from "./dutchSeed.json";
export const CANVAS_ARTIST_ID = "73488cf7-3d3f-46ac-8cb1-74424c162ed6";
export const DUTCH_ARTIST_ID = "6cb3d81a-3d02-4c57-a711-bb7902a9af1b";
export const blockSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/),
    kind: z.enum([
      "timeline",
      "cards",
      "media",
      "quote",
      "comparison",
      "document",
    ]),
    title: z.string().min(1).max(100),
    items: z.array(z.string().min(1).max(300)).min(1).max(8),
    span: z.union([z.literal(1), z.literal(2)]),
  })
  .strict();
export const specSchema = z
  .object({ blocks: z.array(blockSchema).max(8) })
  .strict();
export const canvasRequestSchema = z
  .object({
    version: z.literal("canvas.v1"),
    sessionId: z.string().uuid(),
    turnId: z.string().uuid(),
    baseRevision: z.number().int().nonnegative().max(10000),
    spec: specSchema,
    pinnedIds: z.array(z.string().max(60)).max(8),
    selectedIds: z.array(z.string().max(300)).max(8),
    focusId: z.string().max(60).nullable(),
  })
  .strict();
export type CanvasSpec = z.infer<typeof specSchema>;
export type CanvasRequest = z.infer<typeof canvasRequestSchema>;
export type CanvasEvidence = {
  id: string;
  title: string;
  url: string;
  text: string;
  category: string;
  date: string | null;
  dateKind: string;
  image?: string;
  mediaKind?: "instagram";
  limitation: string;
  page?: number;
  pagePreview?: string;
  attribution?: string;
  workUrl?: string;
};
export type CanvasUpdate = {
  explanation?: string;
  version: "canvas.v1";
  sessionId: string;
  turnId: string;
  baseRevision: number;
  revision: number;
  nextSpec: CanvasSpec;
  evidence: CanvasEvidence[];
  changes: { added: string[]; updated: string[]; removed: string[] };
};
export const canvasSeed = seed as CanvasEvidence[];

export const canvasSeeds: Record<string, CanvasEvidence[]> = {
  [CANVAS_ARTIST_ID]: canvasSeed,
  [DUTCH_ARTIST_ID]: dutchSeed as CanvasEvidence[],
};

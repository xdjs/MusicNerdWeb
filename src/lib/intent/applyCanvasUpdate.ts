import { z } from "zod";
import {
  specSchema,
  type CanvasRequest,
  type CanvasUpdate,
} from "./canvasProtocol";
import { validateCanvasSpec } from "./validateCanvasSpec";
const evidenceSchema = z
  .object({
    id: z.string().max(300),
    title: z.string().max(300),
    url: z
      .string()
      .url()
      .refine((url) => /^https?:\/\//.test(url)),
    text: z.string().max(2000),
    category: z.string().max(40),
    date: z.string().nullable(),
    dateKind: z.string().max(80),
    image: z
      .string()
      .regex(/^\/demo\/(?:latasha|dutchyyy)\/[a-z-]+\.jpg$/)
      .optional(),
    limitation: z.string().max(1000),
    pagePreview: z
      .string()
      .regex(/^\/demo\/dutchyyy\/[a-z-]+\.jpg$/)
      .optional(),
    page: z.number().int().min(1).max(1000).optional(),
    attribution: z.string().max(200).optional(),
    workUrl: z
      .string()
      .url()
      .refine((url) => /^https?:\/\//.test(url))
      .optional(),
  })
  .strict();
const updateSchema = z
  .object({
    version: z.literal("canvas.v1"),
    sessionId: z.string().uuid(),
    turnId: z.string().uuid(),
    baseRevision: z.number().int(),
    revision: z.number().int(),
    nextSpec: specSchema,
    evidence: z.array(evidenceSchema).max(64),
    changes: z
      .object({
        added: z.array(z.string()),
        updated: z.array(z.string()),
        removed: z.array(z.string()),
      })
      .strict(),
  })
  .strict();
/** Atomic client boundary: a malformed, stale or cross-session turn never changes the canvas. */
export function applyCanvasUpdate(
  value: unknown,
  request: CanvasRequest,
): CanvasUpdate {
  const update = updateSchema.parse(value);
  if (
    update.sessionId !== request.sessionId ||
    update.turnId !== request.turnId ||
    update.baseRevision !== request.baseRevision ||
    update.revision !== request.baseRevision + 1
  )
    throw new Error("Stale canvas response");
  validateCanvasSpec(
    update.nextSpec,
    update.evidence,
    request.pinnedIds,
    request.spec,
  );
  return update;
}

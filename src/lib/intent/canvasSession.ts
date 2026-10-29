import { z } from "zod";
import { specSchema, type CanvasEvidence } from "./canvasProtocol";
import { evidenceSchema } from "./applyCanvasUpdate";
const schema = z.object({
  version: z.literal(2),
  artistId: z.string(),
  sessionId: z.string().uuid().nullable(),
  state: z.object({
    spec: specSchema,
    revision: z.number().int().min(0).max(10000),
    evidence: z.array(evidenceSchema).max(64),
  }),
  pinned: z.array(z.string()).max(8),
  selected: z.array(z.string()).max(8),
  expanded: z.array(z.string()).max(8),
  explanations: z.record(z.string(), z.string().max(900)),
  messages: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(["user", "assistant"]),
        parts: z.array(
          z.union([
            z.object({ type: z.literal("text"), text: z.string().max(10000) }),
            z.object({
              type: z.literal("source-url"),
              sourceId: z.string().max(100),
              title: z.string().max(500).optional(),
              url: z
                .string()
                .url()
                .refine((url) => /^https?:\/\//.test(url)),
            }),
          ]),
        ),
      }),
    )
    .max(60),
});
export type CanvasSession = z.infer<typeof schema>;
export function readCanvasSession(
  raw: string | null,
  artistId: string,
): CanvasSession | null {
  try {
    if (!raw || raw.length > 250000) return null;
    const value = schema.parse(JSON.parse(raw));
    if (value.artistId !== artistId) return null;
    const blocks = new Set(value.state.spec.blocks.map((b) => b.id));
    const evidence = new Set(
      value.state.evidence.map((e: CanvasEvidence) => e.id),
    );
    if (
      value.state.spec.blocks.some((b) =>
        b.items.some((id) => !evidence.has(id)),
      )
    )
      return null;
    value.pinned = value.pinned.filter((id) => blocks.has(id));
    value.expanded = value.expanded.filter((id) => blocks.has(id));
    const visible = new Set(value.state.spec.blocks.flatMap((b) => b.items));
    value.selected = value.selected.filter((id) => visible.has(id));
    return value;
  } catch {
    return null;
  }
}

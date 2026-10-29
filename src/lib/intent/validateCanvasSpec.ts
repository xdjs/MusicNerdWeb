import {
  specSchema,
  type CanvasEvidence,
  type CanvasSpec,
} from "./canvasProtocol";
/** Validate a full presentation spec against server-owned evidence and pinned blocks. */
export function validateCanvasSpec(
  value: unknown,
  evidence: CanvasEvidence[],
  pinnedIds: string[],
  previous: CanvasSpec,
): CanvasSpec {
  const spec = specSchema.parse(value);
  const ids = new Set<string>();
  for (const block of spec.blocks) {
    if (ids.has(block.id)) throw new Error("Duplicate block ID");
    ids.add(block.id);
    for (const id of block.items) {
      const item = evidence.find((source) => source.id === id);
      if (!item) throw new Error("Unknown evidence ID");
      if (block.kind === "quote" && item.category !== "quote")
        throw new Error("Quote must use verified quotation");
      if (block.kind === "timeline" && !item.date)
        throw new Error("Timeline requires a verified date");
      if (
        block.kind === "media" &&
        !["film", "process"].includes(item.category)
      )
        throw new Error("Media requires a verified media item");
    }
  }
  for (const id of pinnedIds) {
    const old = previous.blocks.find((block) => block.id === id);
    if (
      !old ||
      JSON.stringify(old) !==
        JSON.stringify(spec.blocks.find((block) => block.id === id))
    )
      throw new Error("Pinned block changed");
  }
  const oldOrder = previous.blocks
    .filter((b) => pinnedIds.includes(b.id))
    .map((b) => b.id);
  const newOrder = spec.blocks
    .filter((b) => pinnedIds.includes(b.id))
    .map((b) => b.id);
  if (JSON.stringify(oldOrder) !== JSON.stringify(newOrder))
    throw new Error("Pinned relative order changed");
  return spec;
}

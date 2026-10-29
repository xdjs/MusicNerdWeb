import {
  canvasSeeds,
  CANVAS_ARTIST_ID,
  type CanvasRequest,
  type CanvasSpec,
  type CanvasUpdate,
} from "./canvasProtocol";
import { validateCanvasSpec } from "./validateCanvasSpec";
/** A disclosed, scripted mock of the UI-message protocol. No provider or network calls. */
export function createReplayResponse(
  body: {
    messages: { parts: { type: string; text?: string }[] }[];
    canvas: CanvasRequest;
  },
  artistId = CANVAS_ARTIST_ID,
): Response {
  const canvasSeed = canvasSeeds[artistId];
  const request = body.canvas;
  const question =
    body.messages
      .at(-1)
      ?.parts.filter((p) => p.type === "text")
      .map((p) => p.text)
      .join(" ")
      .trim() ?? "";
  let blocks = [...request.spec.blocks];
  let answer = "";
  const upsert = (block: CanvasSpec["blocks"][number]) => {
    const i = blocks.findIndex((old) => old.id === block.id);
    if (i < 0) blocks.push(block);
    else blocks[i] = block;
  };
  switch (question) {
    case "Explore his archive":
      upsert({
        id: "archive",
        kind: "document",
        title: "Inside the Lore vault",
        items: ["dutch-archive", "dutch-junk"],
        span: 2,
      });
      upsert({
        id: "voice",
        kind: "quote",
        title: "Why preserve it?",
        items: ["dutch-preface"],
        span: 1,
      });
      answer =
        "These are selected passages from the public Lore PDFs, with document page links. His preface is distinguished from the discography’s claims.";
      break;
    case "Focus on improvisation":
      upsert({
        id: "process",
        kind: "document",
        title: "An improvisation thread",
        items: ["dutch-improv"],
        span: 2,
      });
      answer =
        "The archive connects two series through improvisation. Their date ranges and identities remain distinct.";
      break;
    case "Show his early releases":
      upsert({
        id: "career",
        kind: "timeline",
        title: "Recording and release are different moments",
        items: ["dutch-equilibrium", "dutch-junk", "dutch-reach"],
        span: 2,
      });
      answer =
        "The timeline uses release dates reported in the discography. Each passage keeps its recording or title range visible alongside it.";
      break;
    case "Show me her career":
      upsert({
        id: "career",
        kind: "timeline",
        title: "A career, in documented moments",
        items: ["teen", "past", "meds", "zora", "out"],
        span: 2,
      });
      answer =
        "A timeline brings dated releases and the ZORA conversation together. Dates keep their source meaning.";
      break;
    case "Focus on independence":
      if (!request.pinnedIds.includes("career"))
        upsert({
          id: "career",
          kind: "timeline",
          title: "The independence thread · 2021",
          items: ["meds", "zora"],
          span: 1,
        });
      upsert({
        id: "voice",
        kind: "quote",
        title: "Artist first",
        items: ["independence"],
        span: 1,
      });
      answer =
        "The timeline now focuses on 2021, with her own words beside it. This is a thematic grouping, not a claim that one event caused the other.";
      break;
    case "What was she releasing then?":
      if (!blocks.some((b) => b.items.includes("zora")))
        return new Response(
          "Start with the independence thread so “then” has a defined focus.",
          { status: 400 },
        );
      upsert({
        id: "listening",
        kind: "cards",
        title: "A release from that period",
        items: ["meds"],
        span: 1,
      });
      answer =
        "I kept the timeline and artist voice, and added the March 2021 beat tape as a listening card.";
      break;
    case "Add her visual work":
      upsert({
        id: "visuals",
        kind: "media",
        title: "Music, film & process",
        items: ["wave", "worldbuilders"],
        span: 2,
      });
      answer =
        "The visual work sits alongside the existing thread. No release dates are inferred for these videos.";
      break;
    case "Keep the timeline, compare two releases and remove videos":
      blocks = blocks.filter(
        (b) => b.kind !== "media" || request.pinnedIds.includes(b.id),
      );
      upsert({
        id: "comparison",
        kind: "comparison",
        title: "Two releases, side by side",
        items:
          request.selectedIds.filter((id) =>
            canvasSeed.some((s) => s.id === id && s.category === "release"),
          ).length === 2
            ? request.selectedIds
            : ["meds", "out"],
        span: 2,
      });
      answer =
        "The timeline stays. Two releases now sit side by side; unpinned video blocks are removed.";
      break;
    case "Compare my selection":
      if (request.selectedIds.length !== 2)
        return new Response("Select exactly two evidence cards to compare.", {
          status: 400,
        });
      upsert({
        id: "comparison",
        kind: "comparison",
        title: "Your selection, side by side",
        items: request.selectedIds,
        span: 2,
      });
      answer =
        "Your selected evidence is compared without replacing the surrounding canvas.";
      break;
    default:
      return new Response(
        "Replay mode supports the suggested conversation steps. Free-form model planning is not enabled yet.",
        { status: 400 },
      );
  }
  let nextSpec: CanvasSpec;
  try {
    nextSpec = validateCanvasSpec(
      { blocks },
      canvasSeed,
      request.pinnedIds,
      request.spec,
    );
  } catch {
    return new Response(
      "A pinned block would change. Unpin it first, or choose another step.",
      { status: 409 },
    );
  }
  const update: CanvasUpdate = {
    version: "canvas.v1",
    sessionId: request.sessionId,
    turnId: request.turnId,
    baseRevision: request.baseRevision,
    revision: request.baseRevision + 1,
    nextSpec,
    evidence: canvasSeed.filter((e) =>
      blocks.some((b) => b.items.includes(e.id)),
    ),
    changes: {
      added: blocks
        .filter((b) => !request.spec.blocks.some((p) => p.id === b.id))
        .map((b) => b.id),
      updated: blocks
        .filter((b) =>
          request.spec.blocks.some(
            (p) => p.id === b.id && JSON.stringify(p) !== JSON.stringify(b),
          ),
        )
        .map((b) => b.id),
      removed: request.spec.blocks
        .filter((p) => !blocks.some((b) => b.id === p.id))
        .map((b) => b.id),
    },
  };
  const chunks = [
    { type: "start", messageId: request.turnId },
    { type: "start-step" },
    { type: "text-start", id: "answer" },
    { type: "text-delta", id: "answer", delta: answer },
    { type: "text-end", id: "answer" },
    { type: "data-canvas", data: update },
    { type: "finish-step" },
    { type: "finish", finishReason: "stop" },
  ];
  return new Response(
    chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") +
      "data: [DONE]\n\n",
    {
      headers: {
        "Content-Type": "text/event-stream",
        "x-vercel-ai-ui-message-stream": "v1",
      },
    },
  );
}

import { applyCanvasUpdate } from "../applyCanvasUpdate";
import { createReplayResponse } from "../createReplayResponse";
import {
  canvasSeed,
  type CanvasRequest,
  type CanvasUpdate,
} from "../canvasProtocol";
const request: CanvasRequest = {
  version: "canvas.v1",
  sessionId: "11111111-1111-4111-8111-111111111111",
  turnId: "22222222-2222-4222-8222-222222222222",
  baseRevision: 0,
  spec: { blocks: [] },
  pinnedIds: [],
  selectedIds: [],
  focusId: null,
};
async function replay(question: string, context = request) {
  const response = createReplayResponse({
    messages: [{ parts: [{ type: "text", text: question }] }],
    canvas: context,
  });
  const text = await response.text();
  if (response.status !== 200) throw new Error(text);
  return JSON.parse(
    text
      .split("\n")
      .find((line) => line.includes('"type":"data-canvas"'))!
      .slice(6),
  ).data as CanvasUpdate;
}
it("keeps one evolving canvas over three turns, then compares without replacing the timeline", async () => {
  const one = applyCanvasUpdate(await replay("Show me her career"), request);
  const r2 = { ...request, baseRevision: 1, spec: one.nextSpec };
  const two = applyCanvasUpdate(await replay("Focus on independence", r2), r2);
  const r3 = { ...request, baseRevision: 2, spec: two.nextSpec };
  const three = applyCanvasUpdate(
    await replay("What was she releasing then?", r3),
    r3,
  );
  expect(three.nextSpec.blocks.map((b) => b.id)).toEqual([
    "career",
    "voice",
    "listening",
  ]);
  expect(three.nextSpec.blocks[0]).toEqual(two.nextSpec.blocks[0]);
  const r4 = {
    ...request,
    baseRevision: 3,
    spec: three.nextSpec,
    pinnedIds: ["career"],
  };
  const four = applyCanvasUpdate(
    await replay(
      "Keep the timeline, compare two releases and remove videos",
      r4,
    ),
    r4,
  );
  expect(four.nextSpec.blocks[0]).toEqual(three.nextSpec.blocks[0]);
  expect(four.nextSpec.blocks.at(-1)?.kind).toBe("comparison");
});
it("rejects stale turns and unknown evidence atomically", async () => {
  const update = await replay("Show me her career");
  expect(() =>
    applyCanvasUpdate({ ...update, baseRevision: 9 }, request),
  ).toThrow("Stale");
  expect(() =>
    applyCanvasUpdate(
      {
        ...update,
        nextSpec: {
          blocks: [
            {
              id: "bad",
              kind: "cards",
              title: "bad",
              items: ["invented"],
              span: 1,
            },
          ],
        },
      },
      request,
    ),
  ).toThrow();
  expect(() =>
    applyCanvasUpdate(
      {
        ...update,
        evidence: [{ ...canvasSeed[0], url: "javascript:alert(1)" }],
      },
      request,
    ),
  ).toThrow();
});
it("discloses unsupported replay inputs instead of fabricating an answer", async () => {
  await expect(replay("Explain her touring strategy")).rejects.toThrow(
    "Replay mode",
  );
});

it("keeps Dutchyyy evidence separate and preserves PDF page metadata", async () => {
  const { DUTCH_ARTIST_ID } = await import("../canvasProtocol");
  const request = {
    version: "canvas.v1" as const,
    sessionId: "11111111-1111-4111-8111-111111111111",
    turnId: "22222222-2222-4222-8222-222222222222",
    baseRevision: 0,
    spec: { blocks: [] },
    pinnedIds: [],
    selectedIds: [],
    focusId: null,
  };
  const response = createReplayResponse(
    {
      messages: [{ parts: [{ type: "text", text: "Explore his archive" }] }],
      canvas: request,
    },
    DUTCH_ARTIST_ID,
  );
  const chunks = (await response.text())
    .split("\n")
    .filter((line) => line.startsWith("data: {"))
    .map((line) => JSON.parse(line.slice(6)));
  const update = applyCanvasUpdate(
    chunks.find((chunk) => chunk.type === "data-canvas").data,
    request,
  );
  expect(
    update.evidence.every((source) => source.id.startsWith("dutch-")),
  ).toBe(true);
  expect(
    update.evidence.find((source) => source.id === "dutch-junk")?.page,
  ).toBe(3);
  expect(
    update.evidence.find((source) => source.id === "dutch-junk")?.workUrl,
  ).toContain("bandcamp.com");
});
it("rejects injected actions, arbitrary image URLs, malformed revisions and cross-session responses without mutating input", async () => {
  const valid = await replay("Show me her career");
  const before = JSON.stringify(request);
  const attacks = [
    { ...valid, action: { url: "https://evil.example/steal" } },
    { ...valid, sessionId: "33333333-3333-4333-8333-333333333333" },
    { ...valid, revision: 99 },
    {
      ...valid,
      nextSpec: {
        blocks: [
          { ...valid.nextSpec.blocks[0], action: "execute", code: "alert(1)" },
        ],
      },
    },
    {
      ...valid,
      evidence: [
        { ...canvasSeed[0], image: "https://evil.example/tracker.png" },
      ],
    },
    {
      ...valid,
      evidence: [
        {
          ...canvasSeed[0],
          workUrl: "data:text/html,<script>alert(1)</script>",
        },
      ],
    },
  ];
  for (const attack of attacks)
    expect(() => applyCanvasUpdate(attack, request)).toThrow();
  expect(JSON.stringify(request)).toBe(before);
});

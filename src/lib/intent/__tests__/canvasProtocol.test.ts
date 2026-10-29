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

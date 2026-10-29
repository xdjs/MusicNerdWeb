import { readCanvasSession } from "@/lib/intent/canvasSession";
import { CANVAS_ARTIST_ID, canvasSeed } from "@/lib/intent/canvasProtocol";
const saved = {
  version: 2,
  artistId: CANVAS_ARTIST_ID,
  sessionId: "11111111-1111-4111-8111-111111111111",
  state: {
    revision: 2,
    spec: {
      blocks: [
        { id: "kept", kind: "cards", title: "Kept", items: ["out"], span: 1 },
      ],
    },
    evidence: canvasSeed,
  },
  pinned: ["kept"],
  selected: ["out", "ghost"],
  expanded: ["kept"],
  explanations: { turn: "The source does not establish a date." },
  messages: [],
};
it("restores a bounded artist-specific canvas and removes ghost selections", () => {
  expect(
    readCanvasSession(JSON.stringify(saved), CANVAS_ARTIST_ID),
  ).toMatchObject({
    pinned: ["kept"],
    selected: ["out"],
    state: { revision: 2 },
  });
  expect(readCanvasSession(JSON.stringify(saved), "other")).toBeNull();
  expect(
    readCanvasSession(
      JSON.stringify({ ...saved, version: 1 }),
      CANVAS_ARTIST_ID,
    ),
  ).toBeNull();
  expect(readCanvasSession("{bad", CANVAS_ARTIST_ID)).toBeNull();
});
it("rejects malicious persisted source URLs and missing evidence", () => {
  expect(
    readCanvasSession(
      JSON.stringify({ ...saved, state: { ...saved.state, evidence: [] } }),
      CANVAS_ARTIST_ID,
    ),
  ).toBeNull();
  expect(
    readCanvasSession(
      JSON.stringify({
        ...saved,
        state: {
          ...saved.state,
          evidence: [{ ...canvasSeed[0], url: "javascript:alert(1)" }],
        },
      }),
      CANVAS_ARTIST_ID,
    ),
  ).toBeNull();
});

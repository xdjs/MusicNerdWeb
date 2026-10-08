/** @jest-environment node */
import { createInterviewKnowledgeTools } from "../createInterviewKnowledgeTools";
import { fetchArtistKnowledge } from "../fetchArtistKnowledge";
jest.mock("../fetchArtistKnowledge", () => ({
  fetchArtistKnowledge: jest.fn(),
}));
jest.mock("ai", () => ({ tool: (x: unknown) => x }));
const config = {
  apiOrigin: "https://api.example",
  artistId: "11111111-1111-4111-8111-111111111111",
  getAccessToken: async () => "private-token",
};
const input = {
  sourceId: "vault:22222222-2222-4222-8222-222222222222",
  revision: "a".repeat(64),
  start: 0,
  maxChars: 6000,
};
const options = { toolCallId: "test", messages: [], context: {} };
beforeEach(() => jest.clearAllMocks());
it("keeps search hits out of original evidence until a matching source is opened", async () => {
  const { tools, originals } = createInterviewKnowledgeTools(config);
  jest
    .mocked(fetchArtistKnowledge)
    .mockResolvedValue({ passages: [{ text: "search hit" }] } as never);
  await tools.searchArtistKnowledge.execute!(
    { query: "drums", limit: 4, maxChars: 6000 },
    options,
  );
  expect(originals).toEqual([]);
  const read = {
    status: "ok",
    version: {
      state: "current",
      currentRevision: input.revision,
      capturedAt: null,
    },
    passage: {
      source: { sourceId: input.sourceId, revision: input.revision },
      revision: input.revision,
      start: 0,
      end: 19,
      text: "I played the drums.",
    },
    totalChars: 19,
    nextStart: null,
    returnedChars: 19,
    truncated: false,
  };
  jest.mocked(fetchArtistKnowledge).mockResolvedValue(read as never);
  await tools.readArtistSource.execute!(input, options);
  expect(originals).toEqual([read]);
});
it("rejects a mismatched original instead of attaching the requested reference to it", async () => {
  const { tools, originals } = createInterviewKnowledgeTools(config);
  jest
    .mocked(fetchArtistKnowledge)
    .mockResolvedValue({
      passage: {
        source: { sourceId: "vault:wrong" },
        revision: input.revision,
        start: 0,
        end: 7,
        text: "wrong!!",
      },
      totalChars: 7,
    } as never);
  await expect(tools.readArtistSource.execute!(input, options)).rejects.toThrow(
    /reference/,
  );
  expect(originals).toEqual([]);
});
it("captures artist scope and enforces a per-question call budget", async () => {
  const mutable = { ...config };
  const { tools } = createInterviewKnowledgeTools(mutable);
  mutable.artistId = "another-artist";
  jest
    .mocked(fetchArtistKnowledge)
    .mockResolvedValue({ status: "ok", sources: [] } as never);
  for (let i = 0; i < 10; i++)
    await tools.listArtistSources.execute!({ limit: 20 }, options);
  await expect(
    tools.listArtistSources.execute!({ limit: 20 }, options),
  ).rejects.toThrow(/budget/);
  expect(jest.mocked(fetchArtistKnowledge).mock.calls[0][0].artistId).toBe(
    config.artistId,
  );
  expect("requestArtistResearch" in tools).toBe(false);
});

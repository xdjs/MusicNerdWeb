/** @jest-environment node */
jest.mock("@/server/db/drizzle", () => ({ db: {} }));
jest.mock("@/server/utils/questionGenerator", () => ({
  sourceUrlsForQuestionKeys: jest.fn(),
}));
jest.mock("@/lib/musicNerdApi/const", () => ({
  MUSICNERD_API_URL: "https://api.example",
}));
import { getArtistLatest } from "../artistLatestQueries";
import type { Artist } from "@/server/db/DbTypes";
const artist = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Artist",
} as Artist;
const fetchMock = jest.fn();
beforeEach(() => {
  global.fetch = fetchMock;
  fetchMock.mockReset();
});
it("reads only the shared public endpoint and preserves partial dates", async () => {
  fetchMock.mockResolvedValue(
    streamResponse(
      JSON.stringify({
        status: "ok",
        unavailable: false,
        coverage: [],
        items: [
          {
            id: "release:1",
            kind: "release",
            title: "Record",
            text: "Album",
            date: "2020-02",
            imageUrl: null,
            imageCaption: "art",
            sourceUrl: "https://open.spotify.com/album/1",
            sourceLabel: "Listen",
          },
        ],
      }),
    ),
  );
  const result = await getArtistLatest(artist);
  expect(result.items[0].date).toBe("2020-02");
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(String(fetchMock.mock.calls[0][0])).toBe(
    `https://api.example/api/artist/${artist.id}/latest`,
  );
});
it("does not fall back to live provider requests on failure", async () => {
  fetchMock.mockResolvedValue(streamResponse("", { status: 503 }));
  expect(await getArtistLatest(artist)).toEqual({
    items: [],
    unavailable: true,
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("rejects unsafe source URLs rather than rendering them", async () => {
  fetchMock.mockResolvedValue(
    streamResponse(
      JSON.stringify({
        status: "ok",
        unavailable: false,
        coverage: [],
        items: [
          {
            id: "1",
            kind: "release",
            title: "Record",
            text: "Album",
            date: "2020",
            imageUrl: null,
            imageCaption: "art",
            sourceUrl: "javascript:alert(1)",
            sourceLabel: "Listen",
          },
        ],
      }),
    ),
  );
  expect((await getArtistLatest(artist)).unavailable).toBe(true);
});

function streamResponse(text:string,init?:{status?:number}){return {ok:!init?.status||init.status<400,body:new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(text));controller.close()}})}}

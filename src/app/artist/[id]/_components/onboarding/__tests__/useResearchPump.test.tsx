import { act, renderHook } from "@testing-library/react";
import { useResearchPump } from "../useResearchPump";

jest.mock("@/lib/musicNerdApi/musicNerdApiUrl", () => ({
    musicNerdApiUrl: (path: string) => `https://api.example.test${path}`,
}));

describe("useResearchPump", () => {
    const fetchMock = jest.fn();
    beforeEach(() => {
        fetchMock.mockReset().mockResolvedValue({ ok: true, json: async () => ({ status: "ok", ran: false }) });
        global.fetch = fetchMock as unknown as typeof fetch;
    });

    it("advances the artist's research on MusicNerdAPI", () => {
        const { unmount } = renderHook(() => useResearchPump("artist-1"));
        expect(fetchMock).toHaveBeenCalledWith("https://api.example.test/api/research/advance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ artistId: "artist-1" }),
        });
        unmount();
    });
});

it("limits interview preparation to its opted-in jobs", () => {
  global.fetch = jest.fn().mockResolvedValue({ok: true, json: async () => ({ran: false})});
  const {unmount} = renderHook(() => useResearchPump("artist-1", true, undefined, "interview_prepare"));
  expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({body: JSON.stringify({artistId: "artist-1", kinds: ["interview_prepare"]})}));
  unmount();
});

it("continues a checkpointed interview slice without the twenty-second polling gap", async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn().mockResolvedValueOnce({ok: true, json: async () => ({ran: true, done: false, progress: "preparing", waiting: true})})
    .mockImplementation(() => new Promise(() => {}));
  const {unmount} = renderHook(() => useResearchPump("artist-1", true, undefined, "interview_prepare"));
  await act(async () => {});
  await act(async () => { jest.advanceTimersByTime(100); });
  expect(fetch).toHaveBeenCalledTimes(2);
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(fetch).toHaveBeenCalledTimes(2);
  unmount();
  jest.useRealTimers();
});

import { renderHook } from "@testing-library/react";
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

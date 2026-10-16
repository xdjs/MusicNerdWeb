/** @jest-environment node */
import { wakeDirectoryDiscovery } from "../wakeDirectoryDiscovery";
jest.mock("@/lib/musicNerdApi/musicNerdApiUrl", () => ({
  musicNerdApiUrl: (path: string) => `https://staging.example${path}`,
}));
describe("directory wake", () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    global.fetch = fetchMock;
    fetchMock.mockReset();
  });
  it("awaits only the existing source search for the committed artist", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok", ran: true }),
    });
    await expect(wakeDirectoryDiscovery("artist-id")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://staging.example/api/research/advance",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({
          artistId: "artist-id",
          kinds: ["source_search"],
        }),
        signal: expect.any(AbortSignal),
      }),
    );
  });
  it.each([
    ["failed HTTP", { ok: false }],
    ["worker failure", { ok: true, json: async () => ({ status: "error" }) }],
    [
      "idle worker",
      { ok: true, json: async () => ({ status: "ok", ran: false }) },
    ],
  ])("%s preserves the queued recovery path", async (_name, response) => {
    fetchMock.mockResolvedValue(response);
    await expect(wakeDirectoryDiscovery("artist-id")).resolves.toBe(false);
  });
  it("contains network/time-limit failure instead of changing artist creation success", async () => {
    fetchMock.mockRejectedValue(new Error("aborted"));
    await expect(wakeDirectoryDiscovery("artist-id")).resolves.toBe(false);
  });
});

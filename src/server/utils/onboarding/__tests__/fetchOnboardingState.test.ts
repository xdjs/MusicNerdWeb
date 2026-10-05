import { fetchOnboardingState } from "@/server/utils/onboarding/fetchOnboardingState";
import { musicNerdApiUrl } from "@/lib/musicNerdApi/musicNerdApiUrl";

const ID = "aab92f80-f9e1-4299-aa33-7dd85c8de5d3";
const steps = { profiles: "2026-10-02T23:33:42.122Z", vault: null, interview: null, publish: null };
const fetchMock = jest.fn();

beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const reply = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

describe("fetchOnboardingState", () => {
    it("reads the state from MusicNerdAPI, uncached", async () => {
        fetchMock.mockResolvedValueOnce(reply(200, { status: "ok", complete: false, currentStep: "vault", steps }));
        expect(await fetchOnboardingState(ID)).toEqual({ complete: false, currentStep: "vault", steps });
        expect(fetchMock).toHaveBeenCalledWith(
            musicNerdApiUrl(`/api/onboarding/${ID}/state`),
            expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }),
        );
    });

    it("is null (unknown, no takeover) when MusicNerdAPI can't read the state", async () => {
        fetchMock.mockResolvedValueOnce(reply(503, { status: "error", error: "Onboarding state unavailable" }));
        expect(await fetchOnboardingState(ID)).toBeNull();
    });

    it("is null when the request fails or times out", async () => {
        fetchMock.mockRejectedValueOnce(new Error("The operation was aborted due to timeout"));
        expect(await fetchOnboardingState(ID)).toBeNull();
    });
});

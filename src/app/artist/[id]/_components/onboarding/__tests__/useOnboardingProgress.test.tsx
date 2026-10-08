import { act, renderHook } from "@testing-library/react";

const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), refresh: mockRefresh }),
    usePathname: () => "",
    useSearchParams: () => new URLSearchParams(),
}));
jest.mock("@/lib/musicNerdApi/musicNerdApiUrl", () => ({
    musicNerdApiUrl: (path: string) => `https://api.example.test${path}`,
}));

import { useOnboardingProgress, POLL_MS, STALL_MS } from "../useOnboardingProgress";

const none = { profiles: null, vault: null, interview: null, publish: null };
const start = { complete: false, currentStep: "profiles" as const, steps: none };
const fetchMock = jest.fn();
const reply = (body: object) => ({ ok: true, status: 200, json: async () => ({ status: "ok", ...body }) });
const tick = async (ms = POLL_MS) => { await act(async () => { await jest.advanceTimersByTimeAsync(ms); }); };

beforeEach(() => {
    jest.useFakeTimers();
    mockRefresh.mockReset();
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
});
afterEach(() => jest.useRealTimers());

describe("useOnboardingProgress", () => {
    it("polls the state endpoint, uncached, about every 2 s", async () => {
        fetchMock.mockResolvedValue(reply(start));
        renderHook(() => useOnboardingProgress("a1", start, jest.fn()));
        await tick();
        expect(fetchMock).toHaveBeenCalledWith("https://api.example.test/api/onboarding/a1/state", { cache: "no-store" });
        await tick();
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(mockRefresh).not.toHaveBeenCalled();
    });

    it("refreshes the page once per newly confirmed step and exposes the new steps", async () => {
        const profiles = { ...none, profiles: "t1" };
        fetchMock.mockResolvedValueOnce(reply({ complete: false, currentStep: "vault", steps: profiles }))
            .mockResolvedValueOnce(reply({ complete: false, currentStep: "vault", steps: profiles }));
        const { result } = renderHook(() => useOnboardingProgress("a1", start, jest.fn()));
        await tick();
        expect(mockRefresh).toHaveBeenCalledTimes(1);
        expect(result.current.steps.profiles).toBe("t1");
        expect(result.current.currentStep).toBe("vault");
        await tick();
        expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it("on complete refreshes once, calls onComplete once and stops polling", async () => {
        const all = { profiles: "t1", vault: "t2", interview: "t3", publish: "t3" };
        fetchMock.mockResolvedValue(reply({ complete: true, currentStep: null, steps: all }));
        const onComplete = jest.fn();
        const { result } = renderHook(() => useOnboardingProgress("a1", { ...start, steps: { ...none, profiles: "t1", vault: "t2" }, currentStep: "interview" }, onComplete));
        await tick();
        expect(result.current.complete).toBe(true);
        expect(mockRefresh).toHaveBeenCalledTimes(1);
        expect(onComplete).toHaveBeenCalledTimes(1);
        await tick(POLL_MS * 3);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("doesn't poll at all when the build is already complete", async () => {
        renderHook(() => useOnboardingProgress("a1", { complete: true, currentStep: null, steps: { profiles: "a", vault: "b", interview: "c", publish: "c" } }, jest.fn()));
        await tick(POLL_MS * 2);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("skips an unreadable poll and keeps polling, never treating it as not started", async () => {
        fetchMock.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
            .mockRejectedValueOnce(new Error("network"))
            .mockResolvedValueOnce(reply({ complete: false, currentStep: "vault", steps: { ...none, profiles: "t1" } }));
        const { result } = renderHook(() => useOnboardingProgress("a1", start, jest.fn()));
        await tick();
        await tick();
        expect(result.current.steps).toEqual(none);
        await tick();
        expect(result.current.steps.profiles).toBe("t1");
    });

    it("flags a stall when no step is confirmed for 90 s, and a retry clears it", async () => {
        fetchMock.mockResolvedValue(reply(start));
        const { result } = renderHook(() => useOnboardingProgress("a1", start, jest.fn()));
        await tick(STALL_MS - POLL_MS);
        expect(result.current.stalled).toBe(false);
        await tick(POLL_MS * 2);
        expect(result.current.stalled).toBe(true);
        act(() => result.current.resetStall());
        expect(result.current.stalled).toBe(false);
    });
});

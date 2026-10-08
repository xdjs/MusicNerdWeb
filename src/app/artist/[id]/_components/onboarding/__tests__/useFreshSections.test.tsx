import { act, renderHook } from "@testing-library/react";
import { useFreshSections, FRESH_MS } from "../useFreshSections";
import type { OnboardingSteps } from "@/lib/onboarding/onboardingStateTypes";

const none: OnboardingSteps = { profiles: null, vault: null, interview: null, publish: null };

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("useFreshSections", () => {
    it("is not fresh for steps already confirmed when the page started watching", () => {
        const { result } = renderHook(() => useFreshSections({ ...none, profiles: "t1" }));
        expect(result.current.fresh).toEqual({ profiles: false, vault: false, publish: false });
    });

    it("makes a section fresh when its step is confirmed while watching", () => {
        const { result, rerender } = renderHook(({ steps }) => useFreshSections(steps), { initialProps: { steps: none } });
        rerender({ steps: { ...none, profiles: "t1" } });
        expect(result.current.fresh.profiles).toBe(true);
        expect(result.current.fresh.vault).toBe(false);
    });

    it("stays fresh until 5 s after the section has been on screen", () => {
        const { result, rerender } = renderHook(({ steps }) => useFreshSections(steps), { initialProps: { steps: none } });
        rerender({ steps: { ...none, vault: "t2" } });
        act(() => { jest.advanceTimersByTime(FRESH_MS * 3); });
        expect(result.current.fresh.vault).toBe(true);
        act(() => result.current.markSeen("vault"));
        act(() => { jest.advanceTimersByTime(FRESH_MS - 1); });
        expect(result.current.fresh.vault).toBe(true);
        act(() => result.current.markSeen("vault"));
        act(() => { jest.advanceTimersByTime(1); });
        expect(result.current.fresh.vault).toBe(false);
    });

    it("ignores being seen before it arrived", () => {
        const { result, rerender } = renderHook(({ steps }) => useFreshSections(steps), { initialProps: { steps: none } });
        act(() => result.current.markSeen("publish"));
        rerender({ steps: { ...none, interview: "t3", publish: "t3" } });
        act(() => { jest.advanceTimersByTime(FRESH_MS * 2); });
        expect(result.current.fresh.publish).toBe(true);
    });
});

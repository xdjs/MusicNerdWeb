import { act, renderHook } from "@testing-library/react";
import type { OnboardingStepName } from "@/lib/onboarding/onboardingStateTypes";
import { useFollowResearch } from "../useFollowResearch";

function section(id: string) {
    const el = document.createElement("div");
    el.id = id;
    el.scrollIntoView = jest.fn();
    document.body.appendChild(el);
    return el.scrollIntoView as jest.Mock;
}

function setReducedMotion(reduced: boolean) {
    window.matchMedia = jest.fn().mockReturnValue({ matches: reduced }) as unknown as typeof window.matchMedia;
}

describe("useFollowResearch", () => {
    let links: jest.Mock, lore: jest.Mock, about: jest.Mock;
    beforeEach(() => {
        document.body.innerHTML = "";
        links = section("mn-links");
        lore = section("mn-lore");
        about = section("mn-about");
        setReducedMotion(false);
    });

    it("scrolls to the section being researched each time the step changes", () => {
        const { rerender } = renderHook(({ step }) => useFollowResearch(step, true), { initialProps: { step: "profiles" as OnboardingStepName | null } });
        expect(links).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
        rerender({ step: "vault" });
        expect(lore).toHaveBeenCalledTimes(1);
        rerender({ step: "publish" });
        expect(about).toHaveBeenCalledTimes(1);
    });

    it.each([
        ["a wheel turn", () => window.dispatchEvent(new Event("wheel"))],
        ["a touch drag", () => window.dispatchEvent(new Event("touchmove"))],
        ["a scroll key", () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown" }))],
    ])("stops following for the visit after %s", (_, input) => {
        const { rerender } = renderHook(({ step }) => useFollowResearch(step, true), { initialProps: { step: "profiles" as OnboardingStepName | null } });
        act(() => input());
        rerender({ step: "vault" });
        rerender({ step: "publish" });
        expect(lore).not.toHaveBeenCalled();
        expect(about).not.toHaveBeenCalled();
    });

    it("keeps following after a key that does not scroll", () => {
        const { rerender } = renderHook(({ step }) => useFollowResearch(step, true), { initialProps: { step: "profiles" as OnboardingStepName | null } });
        act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" })); });
        rerender({ step: "vault" });
        expect(lore).toHaveBeenCalledTimes(1);
    });

    it("jumps instead of smooth-scrolling with reduced motion", () => {
        setReducedMotion(true);
        renderHook(() => useFollowResearch("vault", true));
        expect(lore).toHaveBeenCalledWith({ behavior: "instant", block: "start" });
    });

    it("does nothing while inactive (complete or failed)", () => {
        const { rerender } = renderHook(({ step, active }) => useFollowResearch(step, active), { initialProps: { step: "profiles" as OnboardingStepName | null, active: false } });
        rerender({ step: "vault", active: false });
        expect(links).not.toHaveBeenCalled();
        expect(lore).not.toHaveBeenCalled();
    });

    it("stops listening when unmounted", () => {
        const remove = jest.spyOn(window, "removeEventListener");
        const { unmount } = renderHook(() => useFollowResearch("profiles", true));
        unmount();
        expect(remove.mock.calls.map(c => c[0])).toEqual(expect.arrayContaining(["wheel", "touchmove", "keydown"]));
        remove.mockRestore();
    });
});

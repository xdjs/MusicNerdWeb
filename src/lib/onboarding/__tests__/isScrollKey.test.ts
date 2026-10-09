import { isScrollKey } from "@/lib/onboarding/isScrollKey";

describe("isScrollKey", () => {
    it.each(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "])("counts %p as the artist scrolling", key => {
        expect(isScrollKey(key)).toBe(true);
    });

    it.each(["Tab", "Enter", "a", "Escape", "ArrowLeft"])("does not count %p", key => {
        expect(isScrollKey(key)).toBe(false);
    });
});

import { firstChangedSection } from "@/lib/onboarding/firstChangedSection";

describe("firstChangedSection", () => {
    it("points at Links when research found profiles", () => {
        expect(firstChangedSection(6, 3)).toBe("mn-links");
    });

    it("points at Lore when only sources are new", () => {
        expect(firstChangedSection(0, 3)).toBe("mn-lore");
    });

    it("points at the About when nothing else changed", () => {
        expect(firstChangedSection(0, 0)).toBe("mn-about");
    });
});

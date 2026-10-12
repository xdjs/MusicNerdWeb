import { stepSection } from "@/lib/onboarding/stepSection";

describe("stepSection", () => {
    it("maps each research step to the section it paints", () => {
        expect(stepSection("profiles")).toBe("mn-links");
        expect(stepSection("vault")).toBe("mn-lore");
        expect(stepSection("interview")).toBe("mn-about");
        expect(stepSection("publish")).toBe("mn-about");
    });

    it("has no section when no step is running", () => {
        expect(stepSection(null)).toBeNull();
    });
});

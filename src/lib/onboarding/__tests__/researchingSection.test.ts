import { researchingSection } from "../researchingSection";

describe("researchingSection", () => {
    it("maps the build's current step to the section being researched", () => {
        expect(researchingSection("profiles")).toBe("profiles");
        expect(researchingSection("vault")).toBe("vault");
        expect(researchingSection("publish")).toBe("publish");
    });

    it("counts the interview as the About, which the auto-build confirms with publish", () => {
        expect(researchingSection("interview")).toBe("publish");
    });

    it("is null before the build reports a step", () => {
        expect(researchingSection(null)).toBeNull();
    });
});

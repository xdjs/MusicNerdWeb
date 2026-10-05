import { buildStepLabel } from "@/lib/onboarding/buildStepLabel";

describe("buildStepLabel", () => {
    it("names each step in the artist's terms", () => {
        expect(buildStepLabel("profiles")).toBe("finding your profiles");
        expect(buildStepLabel("vault")).toBe("reading what’s written about you");
        expect(buildStepLabel("interview")).toBe("writing your about");
        expect(buildStepLabel("publish")).toBe("writing your about");
    });

    it("falls back to the build as a whole when there's no current step", () => {
        expect(buildStepLabel(null)).toBe("setting up your page");
    });
});

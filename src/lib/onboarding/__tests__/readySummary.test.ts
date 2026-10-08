import { readySummary } from "@/lib/onboarding/readySummary";

describe("readySummary", () => {
    it("says what research found", () => {
        expect(readySummary(6, 3)).toBe("We found 6 profiles and 3 sources, and wrote your About.");
    });

    it("uses the singular for one", () => {
        expect(readySummary(1, 1)).toBe("We found 1 profile and 1 source, and wrote your About.");
    });

    it("leaves out what wasn't found", () => {
        expect(readySummary(0, 2)).toBe("We found 2 sources, and wrote your About.");
        expect(readySummary(4, 0)).toBe("We found 4 profiles, and wrote your About.");
        expect(readySummary(0, 0)).toBe("We wrote your About.");
    });
});

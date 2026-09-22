import { experimentName } from "@/lib/evals/experimentName";

describe("experimentName", () => {
    it("joins suite, model and the short sha with middle dots", () => {
        expect(experimentName("research", "google/gemini-2.5-flash", "b7a4191e0c5f4a9d"))
            .toBe("research · google/gemini-2.5-flash · b7a4191");
    });

    it("keeps a sha that is already short", () => {
        expect(experimentName("smoke", "google/gemini-2.5-flash", "local")).toBe("smoke · google/gemini-2.5-flash · local");
    });
});

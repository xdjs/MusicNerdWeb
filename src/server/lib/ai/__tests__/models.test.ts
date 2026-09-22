import { MODEL_DEFAULT, MODEL_GROUNDED } from "@/server/lib/ai/models";

describe("models", () => {
    // Gateway ids are `provider/model`; a bare model name would bypass the gateway.
    it("names gateway ids for the default and the grounded model", () => {
        expect(MODEL_DEFAULT).toMatch(/^[a-z]+\/[a-z0-9.-]+$/);
        expect(MODEL_GROUNDED).toBe("google/gemini-2.5-flash");
    });
});

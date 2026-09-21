import { MODEL_FLASH, MODEL_PRO } from "@/server/lib/ai/models";

describe("models", () => {
    // Gateway ids are `provider/model`; a bare Gemini name would bypass the gateway.
    it("names the same Gemini models as before, as gateway ids", () => {
        expect(MODEL_FLASH).toBe("google/gemini-2.5-flash");
        expect(MODEL_PRO).toBe("google/gemini-2.5-pro");
    });
});

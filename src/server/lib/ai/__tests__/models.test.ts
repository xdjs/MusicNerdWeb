import { MODEL_FLASH } from "@/server/lib/ai/models";

describe("models", () => {
    // Gateway ids are `provider/model`; a bare Gemini name would bypass the gateway.
    it("names Gemini Flash as a gateway id", () => {
        expect(MODEL_FLASH).toBe("google/gemini-2.5-flash");
    });
});

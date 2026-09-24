import { withGeminiTimeout } from "@/server/utils/artistDoc/withGeminiTimeout";

describe("withGeminiTimeout", () => {
    afterEach(() => jest.useRealTimers());

    it("resolves with the call's result when it beats the deadline", async () => {
        await expect(withGeminiTimeout(Promise.resolve("doc"), 1_000)).resolves.toBe("doc");
    });

    it("rejects with \"Gemini timeout\", the message callers match on, when the deadline wins", async () => {
        jest.useFakeTimers();
        const race = withGeminiTimeout(new Promise(() => {}), 12_000);
        jest.advanceTimersByTime(12_000);
        await expect(race).rejects.toThrow("Gemini timeout");
    });

    it("defaults to the 15 s document budget", async () => {
        jest.useFakeTimers();
        let settled = false;
        withGeminiTimeout(new Promise(() => {})).catch(() => { settled = true; });
        jest.advanceTimersByTime(14_999);
        await Promise.resolve();
        expect(settled).toBe(false);
        jest.advanceTimersByTime(1);
        await Promise.resolve();
        await Promise.resolve();
        expect(settled).toBe(true);
    });
});

// @ts-nocheck
import { jest } from "@jest/globals";

const sdkGenerateText = jest.fn();
jest.mock("ai", () => ({ generateText: sdkGenerateText, Output: { text: jest.fn() } }));
const googleSearchTool = { id: "google.google_search" };
jest.mock("@ai-sdk/google", () => ({ google: { tools: { googleSearch: jest.fn(() => googleSearchTool) } } }));

describe("generateText", () => {
    beforeEach(() => { jest.resetModules(); sdkGenerateText.mockReset(); sdkGenerateText.mockResolvedValue({ text: "ok" }); });

    it("defaults to the flash model and passes instructions, prompt and temperature through", async () => {
        const { generateText } = await import("@/server/lib/ai/generateText");
        const result = await generateText({ instructions: "be brief", prompt: "hi", temperature: 0.5 });
        expect(result).toEqual({ text: "ok" });
        const call = sdkGenerateText.mock.calls[0][0];
        expect(call.model).toBe((await import("@/server/lib/ai/models")).MODEL_DEFAULT);
        expect(call.instructions).toBe("be brief");
        expect(call.prompt).toBe("hi");
        expect(call.temperature).toBe(0.5);
    });

    it("routes grounded calls to the Gemini model and everything else to the default", async () => {
        const { generateText } = await import("@/server/lib/ai/generateText");
        const { MODEL_DEFAULT, MODEL_GROUNDED } = await import("@/server/lib/ai/models");
        await generateText({ prompt: "hi" });
        expect(sdkGenerateText.mock.calls[0][0].model).toBe(MODEL_DEFAULT);
        await generateText({ prompt: "hi", googleSearch: true });
        expect(sdkGenerateText.mock.calls[1][0].model).toBe(MODEL_GROUNDED);
    });

    it("maps a thinking budget to the SDK reasoning level on non-Google models", async () => {
        const { generateText } = await import("@/server/lib/ai/generateText");
        await generateText({ model: "deepseek/deepseek-v4.1-flash", prompt: "hi", thinkingBudget: 0 });
        expect(sdkGenerateText.mock.calls[0][0].reasoning).toBe("none");
        expect(sdkGenerateText.mock.calls[0][0].providerOptions).toBeUndefined();
        await generateText({ model: "deepseek/deepseek-v4.1-flash", prompt: "hi", thinkingBudget: 512 });
        expect(sdkGenerateText.mock.calls[1][0].reasoning).toBe("low");
        await generateText({ model: "deepseek/deepseek-v4.1-flash", prompt: "hi" });
        expect(sdkGenerateText.mock.calls[2][0].reasoning).toBeUndefined();
    });

    it("logs one line per call with tokens and the gateway generation id", async () => {
        const { generateText } = await import("@/server/lib/ai/generateText");
        sdkGenerateText.mockResolvedValue({ text: "ok", usage: { inputTokens: 120, outputTokens: 30, outputTokenDetails: { reasoningTokens: 7 } }, providerMetadata: { gateway: { generationId: "gen_123" } } });
        const log = jest.spyOn(console, "log").mockImplementation(() => {});
        await generateText({ prompt: "hi" });
        const line = String(log.mock.calls.find(c => String(c[0]).startsWith("[ai] "))?.[0]);
        expect(line).toContain("in=120");
        expect(line).toContain("out=30");
        expect(line).toContain("reasoning=7");
        expect(line).toContain("gen=gen_123");
        log.mockRestore();
    });

    it("uses the model it is given", async () => {
        const { generateText } = await import("@/server/lib/ai/generateText");
        await generateText({ model: "google/gemini-2.5-flash-lite", prompt: "hi" });
        expect(sdkGenerateText.mock.calls[0][0].model).toBe("google/gemini-2.5-flash-lite");
    });

    it("sends a thinking budget as the Google provider option on Gemini, and nothing when there is none", async () => {
        const { generateText } = await import("@/server/lib/ai/generateText");
        await generateText({ model: "google/gemini-2.5-flash", prompt: "hi", thinkingBudget: 0 });
        expect(sdkGenerateText.mock.calls[0][0].providerOptions).toEqual({ google: { thinkingConfig: { thinkingBudget: 0 } } });
        await generateText({ model: "google/gemini-2.5-flash", prompt: "hi" });
        expect(sdkGenerateText.mock.calls[1][0].providerOptions).toBeUndefined();
    });

    it("passes output through untouched", async () => {
        const { generateText } = await import("@/server/lib/ai/generateText");
        const output = { kind: "object" };
        await generateText({ prompt: "hi", output });
        expect(sdkGenerateText.mock.calls[0][0].output).toBe(output);
    });

    it("attaches the provider-executed Google Search tool only when asked", async () => {
        const { generateText } = await import("@/server/lib/ai/generateText");
        await generateText({ prompt: "hi", googleSearch: true });
        expect(sdkGenerateText.mock.calls[0][0].tools).toEqual({ google_search: googleSearchTool });
        await generateText({ prompt: "hi" });
        expect(sdkGenerateText.mock.calls[1][0].tools).toBeUndefined();
    });
});

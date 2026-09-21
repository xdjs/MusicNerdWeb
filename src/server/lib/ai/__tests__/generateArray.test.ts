// @ts-nocheck
import { jest } from "@jest/globals";

const generateText = jest.fn();
jest.mock("@/server/lib/ai/generateText", () => ({ generateText }));
const array = jest.fn((o) => ({ kind: "array", ...o }));
jest.mock("ai", () => ({ Output: { array } }));

describe("generateArray", () => {
    beforeEach(() => { jest.resetModules(); generateText.mockReset(); generateText.mockResolvedValue({ output: ["x"] }); });

    it("wraps the element schema as an array output and forwards every other option", async () => {
        const { generateArray } = await import("@/server/lib/ai/generateArray");
        const element = { parse: () => "" };
        const result = await generateArray({ element, instructions: "list", prompt: "hi", temperature: 0.4, thinkingBudget: 512 });
        expect(result).toEqual({ output: ["x"] });
        expect(array).toHaveBeenCalledWith({ element });
        expect(generateText.mock.calls[0][0]).toEqual({
            instructions: "list", prompt: "hi", temperature: 0.4, thinkingBudget: 512, output: { kind: "array", element },
        });
    });
});

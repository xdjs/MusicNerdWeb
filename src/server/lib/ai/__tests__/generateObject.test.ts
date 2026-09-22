// @ts-nocheck
import { jest } from "@jest/globals";

const generateText = jest.fn();
jest.mock("@/server/lib/ai/generateText", () => ({ generateText }));
const object = jest.fn((o) => ({ kind: "object", ...o }));
jest.mock("ai", () => ({ Output: { object } }));

describe("generateObject", () => {
    beforeEach(() => { jest.resetModules(); generateText.mockReset(); generateText.mockResolvedValue({ output: { a: 1 } }); });

    it("wraps the schema as an object output and forwards every other option", async () => {
        const { generateObject } = await import("@/server/lib/ai/generateObject");
        const schema = { parse: () => ({}) };
        const result = await generateObject({ schema, instructions: "be exact", prompt: "hi", temperature: 0, thinkingBudget: 0 });
        expect(result).toEqual({ output: { a: 1 } });
        expect(object).toHaveBeenCalledWith({ schema });
        expect(generateText.mock.calls[0][0]).toEqual({
            instructions: "be exact", prompt: "hi", temperature: 0, thinkingBudget: 0, output: { kind: "object", schema },
        });
    });
});

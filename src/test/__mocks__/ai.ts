// The `ai` package is ESM-only; Jest maps it here (jest.config.ts) so modules that
// reach src/server/lib/ai transitively load without a transform. Tests that exercise
// a wrapper mock this module themselves with jest.mock("ai", ...).
export const generateText = jest.fn();
export const streamText = jest.fn();
export const Output = {
    text: jest.fn(() => ({ type: "text" })),
    object: jest.fn((options: unknown) => ({ type: "object", options })),
    array: jest.fn((options: unknown) => ({ type: "array", options })),
};

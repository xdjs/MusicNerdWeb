// `@ai-sdk/google` is ESM-only; see ai.ts beside this file.
export const google = {
    tools: { googleSearch: jest.fn(() => ({ type: "provider-defined", id: "google.google_search" })) },
};

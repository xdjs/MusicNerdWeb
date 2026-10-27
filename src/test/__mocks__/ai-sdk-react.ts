// @ai-sdk/react is ESM-only; Jest maps it here (jest.config.ts). A component test
// sets what `useChat` returns and reads the options it was called with.
export const useChat = jest.fn();

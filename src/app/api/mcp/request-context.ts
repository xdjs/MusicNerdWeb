import { AsyncLocalStorage } from "node:async_hooks";

export type McpRequestContext = {
  apiKeyHash: string;
};

export const mcpRequestContext = new AsyncLocalStorage<McpRequestContext>();

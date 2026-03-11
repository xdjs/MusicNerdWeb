// @ts-nocheck
import { jest } from "@jest/globals";

describe("MCP request context", () => {
  beforeEach(() => { jest.resetModules(); });

  async function setup() {
    const { mcpRequestContext } = await import("../request-context");
    const { requireMcpAuth, McpAuthError } = await import("../auth");
    return { mcpRequestContext, requireMcpAuth, McpAuthError };
  }

  it("requireMcpAuth returns apiKeyHash when context is set", async () => {
    const { mcpRequestContext, requireMcpAuth } = await setup();
    const result = mcpRequestContext.run({ apiKeyHash: "test-hash-123" }, () => {
      return requireMcpAuth();
    });
    expect(result).toBe("test-hash-123");
  });

  it("requireMcpAuth throws when context is not set", async () => {
    const { requireMcpAuth, McpAuthError } = await setup();
    expect(() => requireMcpAuth()).toThrow("Authentication required");
    expect(() => requireMcpAuth()).toThrow(McpAuthError);
  });

  it("requireMcpAuth context survives async hops", async () => {
    const { mcpRequestContext, requireMcpAuth } = await setup();
    const result = await mcpRequestContext.run({ apiKeyHash: "async-hash" }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return requireMcpAuth();
    });
    expect(result).toBe("async-hash");
  });
});

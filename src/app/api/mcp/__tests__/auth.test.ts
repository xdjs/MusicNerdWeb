// @ts-nocheck
import { jest } from "@jest/globals";

// The global jest.setup.ts already mocks @/server/db/drizzle, so we rely on that.
// We DO need to add mcpApiKeys to the query mock surface though.

describe("MCP auth", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  async function setup() {
    const { db } = await import("@/server/db/drizzle");
    // Ensure mcpApiKeys query surface exists
    (db as any).query.mcpApiKeys = { findFirst: jest.fn(), findMany: jest.fn() };
    const { hashApiKey, validateMcpApiKey } = await import("../auth");
    return { db, hashApiKey, validateMcpApiKey };
  }

  // Test 1: hashApiKey produces consistent SHA-256 hex digest
  it("hashApiKey produces consistent SHA-256 hex digest", async () => {
    const { hashApiKey } = await setup();
    const hash1 = hashApiKey("test-key");
    const hash2 = hashApiKey("test-key");
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  // Test 2: hashApiKey — different inputs produce different hashes
  it("hashApiKey — different inputs produce different hashes", async () => {
    const { hashApiKey } = await setup();
    expect(hashApiKey("key-a")).not.toBe(hashApiKey("key-b"));
  });

  // Test 3: validateMcpApiKey — returns hash for valid, non-revoked key
  it("validateMcpApiKey — returns hash for valid, non-revoked key", async () => {
    const { db, hashApiKey, validateMcpApiKey } = await setup();
    const testKey = "valid-api-key";
    const testHash = hashApiKey(testKey);
    (db as any).query.mcpApiKeys.findFirst.mockResolvedValue(
      { keyHash: testHash, revokedAt: null }
    );
    const req = new Request("http://localhost/api/mcp", {
      headers: { Authorization: `Bearer ${testKey}` },
    });
    const result = await validateMcpApiKey(req);
    expect(result).toBe(testHash);
  });

  // Test 4: returns null when no Authorization header
  it("validateMcpApiKey — returns null when no Authorization header", async () => {
    const { validateMcpApiKey } = await setup();
    const req = new Request("http://localhost/api/mcp");
    const result = await validateMcpApiKey(req);
    expect(result).toBeNull();
  });

  // Test 5: returns null for malformed header
  it("validateMcpApiKey — returns null for malformed header", async () => {
    const { validateMcpApiKey } = await setup();
    const req = new Request("http://localhost/api/mcp", {
      headers: { Authorization: "Basic abc123" },
    });
    const result = await validateMcpApiKey(req);
    expect(result).toBeNull();
  });

  // Test 5b: accepts lowercase bearer scheme
  it("validateMcpApiKey — accepts lowercase bearer scheme", async () => {
    const { db, hashApiKey, validateMcpApiKey } = await setup();
    const testKey = "valid-api-key";
    const testHash = hashApiKey(testKey);
    (db as any).query.mcpApiKeys.findFirst.mockResolvedValue(
      { keyHash: testHash, revokedAt: null }
    );
    const req = new Request("http://localhost/api/mcp", {
      headers: { Authorization: `bearer ${testKey}` },
    });
    const result = await validateMcpApiKey(req);
    expect(result).toBe(testHash);
  });

  // Test 6: returns null for unknown key
  it("validateMcpApiKey — returns null for unknown key", async () => {
    const { db, validateMcpApiKey } = await setup();
    (db as any).query.mcpApiKeys.findFirst.mockResolvedValue(null);
    const req = new Request("http://localhost/api/mcp", {
      headers: { Authorization: "Bearer unknown-key" },
    });
    const result = await validateMcpApiKey(req);
    expect(result).toBeNull();
  });

  // Test 7: returns null for revoked key
  it("validateMcpApiKey — returns null for revoked key", async () => {
    const { db, hashApiKey, validateMcpApiKey } = await setup();
    const testKey = "revoked-key";
    (db as any).query.mcpApiKeys.findFirst.mockResolvedValue(null);
    const req = new Request("http://localhost/api/mcp", {
      headers: { Authorization: `Bearer ${testKey}` },
    });
    const result = await validateMcpApiKey(req);
    expect(result).toBeNull();
  });
});

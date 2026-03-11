// @ts-nocheck
import { jest } from "@jest/globals";

describe("MCP audit logging", () => {
  beforeEach(() => { jest.resetModules(); });

  async function setup() {
    const { db } = await import("@/server/db/drizzle");
    // Ensure insert chain works
    const mockReturning = jest.fn().mockResolvedValue([]);
    const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
    (db as any).insert = jest.fn().mockReturnValue({ values: mockValues });
    const { logMcpAudit } = await import("../audit");
    return { db, logMcpAudit, mockValues };
  }

  it("inserts audit log row with all fields", async () => {
    const { db, logMcpAudit, mockValues } = await setup();
    await logMcpAudit({
      artistId: "artist-uuid",
      field: "instagram",
      action: "set",
      submittedUrl: "https://instagram.com/test",
      oldValue: "old-user",
      newValue: "test",
      apiKeyHash: "hash-123",
    });
    expect(db.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith({
      artistId: "artist-uuid",
      field: "instagram",
      action: "set",
      submittedUrl: "https://instagram.com/test",
      oldValue: "old-user",
      newValue: "test",
      apiKeyHash: "hash-123",
    });
  });

  it("handles nullable fields", async () => {
    const { db, logMcpAudit, mockValues } = await setup();
    await logMcpAudit({
      artistId: "artist-uuid",
      field: "x",
      action: "delete",
      oldValue: "old-handle",
      apiKeyHash: "hash-456",
    });
    expect(mockValues).toHaveBeenCalledWith({
      artistId: "artist-uuid",
      field: "x",
      action: "delete",
      submittedUrl: null,
      oldValue: "old-handle",
      newValue: null,
      apiKeyHash: "hash-456",
    });
  });
});

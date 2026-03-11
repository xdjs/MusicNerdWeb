// @ts-nocheck
import { jest } from "@jest/globals";

// Mock generateArtistBio before any dynamic imports
jest.mock("@/server/utils/queries/artistQueries", () => ({
  generateArtistBio: jest.fn().mockResolvedValue("mocked bio"),
}));

describe("artistLinkService", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  async function setup() {
    const { db } = await import("@/server/db/drizzle");
    db.execute = jest.fn().mockResolvedValue([]);
    const { generateArtistBio } = await import("@/server/utils/queries/artistQueries");
    const { setArtistLink, clearArtistLink, sanitizeColumnName, BIO_RELEVANT_COLUMNS } = await import("../artistLinkService");
    return { db, setArtistLink, clearArtistLink, sanitizeColumnName, BIO_RELEVANT_COLUMNS, generateArtistBio };
  }

  // 1. sanitizeColumnName strips non-alphanumeric/underscore
  it("sanitizeColumnName strips non-alphanumeric/underscore characters", async () => {
    const { sanitizeColumnName } = await setup();
    expect(sanitizeColumnName("site.name!@#")).toBe("sitename");
  });

  // 2. sanitizeColumnName passes through clean names unchanged
  it("sanitizeColumnName passes through clean names unchanged", async () => {
    const { sanitizeColumnName } = await setup();
    expect(sanitizeColumnName("instagram")).toBe("instagram");
    expect(sanitizeColumnName("youtube_channel")).toBe("youtube_channel");
  });

  // 3. setArtistLink sets a generic text column
  it("setArtistLink sets a generic text column via sql.identifier", async () => {
    const { db, setArtistLink } = await setup();
    await setArtistLink("artist-123", "instagram", "testuser");
    expect(db.execute).toHaveBeenCalled();
  });

  // 4. setArtistLink sets ens directly
  it("setArtistLink sets ens directly", async () => {
    const { db, setArtistLink } = await setup();
    await setArtistLink("artist-123", "ens", "vitalik.eth");
    expect(db.execute).toHaveBeenCalled();
  });

  // 5. setArtistLink triggers bio regen for prompt-relevant column
  it("setArtistLink triggers bio regeneration for prompt-relevant column", async () => {
    const { db, setArtistLink, generateArtistBio } = await setup();
    await setArtistLink("artist-123", "instagram", "testuser");
    // Should have called execute 2 times (set value + null bio)
    expect(db.execute).toHaveBeenCalledTimes(2);
    expect(generateArtistBio).toHaveBeenCalledWith("artist-123");
  });

  // 6. setArtistLink does NOT trigger bio regen for non-relevant column
  it("setArtistLink does NOT trigger bio regeneration for non-relevant column", async () => {
    const { db, setArtistLink, generateArtistBio } = await setup();
    await setArtistLink("artist-123", "tiktok", "testuser");
    expect(db.execute).toHaveBeenCalledTimes(1);
    expect(generateArtistBio).not.toHaveBeenCalled();
  });

  // 7. setArtistLink throws for wallets
  it("setArtistLink throws for wallets siteName", async () => {
    const { setArtistLink } = await setup();
    await expect(setArtistLink("artist-123", "wallets", "0x123")).rejects.toThrow("Wallets must be managed");
  });

  // 8. setArtistLink throws for system column
  it("setArtistLink throws for system column siteName", async () => {
    const { setArtistLink } = await setup();
    await expect(setArtistLink("artist-123", "name", "test")).rejects.toThrow("Cannot write to system column");
    await expect(setArtistLink("artist-123", "id", "test")).rejects.toThrow("Cannot write to system column");
    await expect(setArtistLink("artist-123", "bio", "test")).rejects.toThrow("Cannot write to system column");
  });

  // 9. setArtistLink throws for empty value
  it("setArtistLink throws for empty value", async () => {
    const { setArtistLink } = await setup();
    await expect(setArtistLink("artist-123", "instagram", "")).rejects.toThrow("Value must not be empty");
  });

  // 10. clearArtistLink nulls a generic text column
  it("clearArtistLink nulls a generic text column", async () => {
    const { db, clearArtistLink } = await setup();
    await clearArtistLink("artist-123", "instagram");
    expect(db.execute).toHaveBeenCalled();
  });

  // 11. clearArtistLink triggers bio regen for prompt-relevant column
  it("clearArtistLink triggers bio regeneration for prompt-relevant column", async () => {
    const { db, clearArtistLink, generateArtistBio } = await setup();
    await clearArtistLink("artist-123", "x");
    expect(db.execute).toHaveBeenCalledTimes(2);
    expect(generateArtistBio).toHaveBeenCalledWith("artist-123");
  });

  // 12. clearArtistLink does NOT trigger bio regen for non-relevant column
  it("clearArtistLink does NOT trigger bio regeneration for non-relevant column", async () => {
    const { db, clearArtistLink, generateArtistBio } = await setup();
    await clearArtistLink("artist-123", "tiktok");
    expect(db.execute).toHaveBeenCalledTimes(1);
    expect(generateArtistBio).not.toHaveBeenCalled();
  });

  // 13. clearArtistLink throws for wallets
  it("clearArtistLink throws for wallets siteName", async () => {
    const { clearArtistLink } = await setup();
    await expect(clearArtistLink("artist-123", "wallets")).rejects.toThrow("Wallets must be managed");
  });

  // 14. clearArtistLink throws for system column
  it("clearArtistLink throws for system column siteName", async () => {
    const { clearArtistLink } = await setup();
    await expect(clearArtistLink("artist-123", "name")).rejects.toThrow("Cannot write to system column");
  });
});

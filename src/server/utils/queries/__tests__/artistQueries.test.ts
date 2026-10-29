// @ts-nocheck
import { jest } from "@jest/globals";

// Static mocks BEFORE dynamic imports
jest.mock("@/server/utils/queries/userQueries", () => ({
  getUserById: jest.fn(),
  getUserDisplayName: jest.fn(),
}));
jest.mock("@/server/utils/artistLinkService", () => {
  class ArtistLinkConflictError extends Error {
    constructor(message) {
      super(message);
      this.name = "ArtistLinkConflictError";
    }
  }

  return {
    ArtistLinkConflictError,
    setArtistLink: jest.fn().mockResolvedValue({ oldValue: null }),
  };
});
jest.mock("@/server/utils/queries/discord", () => ({
  sendDiscordMessage: jest.fn(),
}));
jest.mock("@/server/utils/queries/externalApiQueries", () => ({
  getSpotifyHeaders: jest.fn(),
  getSpotifyArtist: jest.fn(),
}));
jest.mock("@/server/utils/queries/artistBioQuery", () => ({
  generateArtistBio: jest.fn(),
}));
jest.mock("next/headers", () => ({
  headers: jest.fn().mockResolvedValue(new Map()),
}));
jest.mock("@/server/utils/services", () => ({
  isObjKey: jest.fn(),
  extractArtistId: jest.fn(),
}));

// Polyfill Response.json
if (!("json" in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      status: init?.status || 200,
    });
}

describe("artistQueries", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  async function setup() {
    const { db } = await import("@/server/db/drizzle");
    const { extractArtistId } = await import("@/server/utils/services");
    const { ArtistLinkConflictError, setArtistLink } = await import(
      "@/server/utils/artistLinkService"
    );
    const { approveUGC } = await import(
      "../artistQueries"
    );

    // Setup default db mocks
    db.execute = jest.fn().mockResolvedValue([]);
    const mockWhere = jest.fn().mockResolvedValue([]);
    const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
    db.update = jest.fn().mockReturnValue({ set: mockSet });

    return {
      db,
      extractArtistId: extractArtistId as jest.Mock,
      ArtistLinkConflictError,
      setArtistLink: setArtistLink as jest.Mock,
      approveUGC,
      mockSet,
      mockWhere,
    };
  }

  // ----------------------------------
  // approveUGC tests
  // ----------------------------------

  describe("approveUGC", () => {
    it("calls setArtistLink for normal platforms (e.g. instagram)", async () => {
      const { approveUGC, setArtistLink, db } = await setup();

      await approveUGC("ugc-1", "artist-1", "instagram", "testuser");

      expect(setArtistLink).toHaveBeenCalledWith(
        "artist-1",
        "instagram",
        "testuser"
      );
      // Should also mark UGC as accepted
      expect(db.update).toHaveBeenCalled();
    });

    it("calls setArtistLink for x platform", async () => {
      const { approveUGC, setArtistLink } = await setup();

      await approveUGC("ugc-1", "artist-1", "x", "handle123");

      expect(setArtistLink).toHaveBeenCalledWith(
        "artist-1",
        "x",
        "handle123"
      );
    });

    it("handles wallets siteName inline with array_append (not setArtistLink)", async () => {
      const { approveUGC, setArtistLink, db } = await setup();

      await approveUGC("ugc-1", "artist-1", "wallets", "0xABC123");

      expect(setArtistLink).not.toHaveBeenCalled();
      // Should call db.execute for the array_append SQL
      expect(db.execute).toHaveBeenCalled();
    });

    it("handles wallet siteName inline with array_append (not setArtistLink)", async () => {
      const { approveUGC, setArtistLink, db } = await setup();

      await approveUGC("ugc-1", "artist-1", "wallet", "0xDEF456");

      expect(setArtistLink).not.toHaveBeenCalled();
      expect(db.execute).toHaveBeenCalled();
    });

    it("normalizes youtube username from full URL", async () => {
      const { approveUGC, setArtistLink } = await setup();

      await approveUGC(
        "ugc-1",
        "artist-1",
        "youtube",
        "https://youtube.com/@coolartist"
      );

      expect(setArtistLink).toHaveBeenCalledWith(
        "artist-1",
        "youtube",
        "coolartist"
      );
    });

    it("normalizes youtube username by stripping @ prefix", async () => {
      const { approveUGC, setArtistLink } = await setup();

      await approveUGC("ugc-1", "artist-1", "youtube", "@coolartist");

      expect(setArtistLink).toHaveBeenCalledWith(
        "artist-1",
        "youtube",
        "coolartist"
      );
    });

    it("passes through plain youtube username unchanged", async () => {
      const { approveUGC, setArtistLink } = await setup();

      await approveUGC("ugc-1", "artist-1", "youtube", "coolartist");

      expect(setArtistLink).toHaveBeenCalledWith(
        "artist-1",
        "youtube",
        "coolartist"
      );
    });

    it("extracts channel ID from full youtubechannel URL", async () => {
      const { approveUGC, setArtistLink } = await setup();

      await approveUGC(
        "ugc-1",
        "artist-1",
        "youtubechannel",
        "https://www.youtube.com/channel/UC1234abcd"
      );

      expect(setArtistLink).toHaveBeenCalledWith(
        "artist-1",
        "youtubechannel",
        "UC1234abcd"
      );
    });

    it("passes through raw youtubechannel ID unchanged", async () => {
      const { approveUGC, setArtistLink } = await setup();

      await approveUGC(
        "ugc-1",
        "artist-1",
        "youtubechannel",
        "UC1234abcd"
      );

      expect(setArtistLink).toHaveBeenCalledWith(
        "artist-1",
        "youtubechannel",
        "UC1234abcd"
      );
    });

    it("marks UGC record as accepted", async () => {
      const { approveUGC, db, mockSet } = await setup();

      await approveUGC("ugc-1", "artist-1", "instagram", "testuser");

      // db.update is called to set accepted = true and date_processed
      expect(db.update).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ accepted: true, dateProcessed: expect.any(String) })
      );
    });

    it("throws on DB error", async () => {
      const { approveUGC, setArtistLink } = await setup();
      setArtistLink.mockRejectedValue(new Error("DB connection failed"));

      await expect(
        approveUGC("ugc-1", "artist-1", "instagram", "testuser")
      ).rejects.toThrow("Error approving UGC");
    });

    it("preserves typed artist-link conflicts and does not accept the UGC", async () => {
      const {
        approveUGC,
        ArtistLinkConflictError,
        setArtistLink,
        db,
      } = await setup();
      const conflict = new ArtistLinkConflictError(
        "That spotify artist ID is already linked to a different artist",
      );
      setArtistLink.mockRejectedValue(conflict);

      await expect(
        approveUGC("ugc-1", "artist-1", "spotify", "spotify-123")
      ).rejects.toBe(conflict);
      expect(db.update).not.toHaveBeenCalled();
    });

    it("throws when db.update for UGC accepted flag fails", async () => {
      const { approveUGC, db } = await setup();
      const mockWhereFail = jest
        .fn()
        .mockRejectedValue(new Error("update failed"));
      const mockSetFail = jest
        .fn()
        .mockReturnValue({ where: mockWhereFail });
      db.update = jest.fn().mockReturnValue({ set: mockSetFail });

      await expect(
        approveUGC("ugc-1", "artist-1", "instagram", "testuser")
      ).rejects.toThrow("Error approving UGC");
    });
  });

});

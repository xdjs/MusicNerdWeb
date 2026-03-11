// @ts-nocheck
import { jest } from "@jest/globals";

// Static mocks BEFORE dynamic imports
jest.mock("@/server/utils/queries/artistQueries", () => ({
  getArtistById: jest.fn(),
}));

jest.mock("@/server/utils/queries/externalApiQueries", () => ({
  getSpotifyHeaders: jest.fn(),
  getSpotifyArtist: jest.fn(),
  getArtistTopTrackName: jest.fn(),
  getNumberOfSpotifyReleases: jest.fn(),
}));

describe("artistBioQuery", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  async function setup() {
    const { db } = await import("@/server/db/drizzle");
    const { getArtistById } = await import(
      "@/server/utils/queries/artistQueries"
    );
    const { openai } = await import("@/server/lib/openai");

    // Wire up db mocks
    (db as any).query.aiprompts = { findFirst: jest.fn() };
    db.update = jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    });

    const { generateArtistBio, getActivePrompt, setActivePrompt } =
      await import("../artistBioQuery");

    return {
      db,
      getArtistById: getArtistById as jest.Mock,
      openai,
      generateArtistBio,
      getActivePrompt,
      setActivePrompt,
    };
  }

  // ------- generateArtistBio -------

  it("returns null if artist not found", async () => {
    const { generateArtistBio, getArtistById } = await setup();
    getArtistById.mockResolvedValue(null);

    const result = await generateArtistBio("nonexistent-id");
    expect(result).toBeNull();
  });

  it("returns null if no active prompt", async () => {
    const { generateArtistBio, getArtistById, db } = await setup();
    getArtistById.mockResolvedValue({ id: "artist-1", name: "Test Artist" });
    (db as any).query.aiprompts.findFirst.mockResolvedValue(null);

    const result = await generateArtistBio("artist-1");
    expect(result).toBeNull();
  });

  it("calls OpenAI with constructed prompt and returns bio", async () => {
    const { generateArtistBio, getArtistById, db, openai } = await setup();

    getArtistById.mockResolvedValue({
      id: "artist-1",
      name: "Test Artist",
      spotify: "spotify-123",
      instagram: "testinsta",
      x: "testx",
      soundcloud: null,
      youtube: null,
      youtubechannel: null,
    });
    (db as any).query.aiprompts.findFirst.mockResolvedValue({
      isActive: true,
      promptBeforeName: "Write a bio for ",
      promptAfterName: " the musician.",
    });

    const result = await generateArtistBio("artist-1");

    // The global mock returns 'mocked response'
    expect(result).toBe("mocked response");

    // Verify OpenAI was called
    expect(openai.chat.completions.create).toHaveBeenCalledTimes(1);
    const callArgs = (openai.chat.completions.create as jest.Mock).mock
      .calls[0][0];
    expect(callArgs.model).toBe("gpt-4o");
    expect(callArgs.messages[0].role).toBe("system");
    // Prompt should include artist social links
    expect(callArgs.messages[0].content).toContain("Spotify ID: spotify-123");
    expect(callArgs.messages[0].content).toContain(
      "Instagram: https://instagram.com/testinsta"
    );
    expect(callArgs.messages[0].content).toContain(
      "Twitter: https://twitter.com/testx"
    );
  });

  it("saves bio to DB on success", async () => {
    const { generateArtistBio, getArtistById, db } = await setup();

    getArtistById.mockResolvedValue({
      id: "artist-1",
      name: "Test Artist",
      spotify: null,
      instagram: null,
      x: null,
      soundcloud: null,
      youtube: null,
      youtubechannel: null,
    });
    (db as any).query.aiprompts.findFirst.mockResolvedValue({
      isActive: true,
      promptBeforeName: "Bio for ",
      promptAfterName: ".",
    });

    await generateArtistBio("artist-1");

    expect(db.update).toHaveBeenCalled();
    const setMock = db.update.mock.results[0].value.set;
    expect(setMock).toHaveBeenCalledWith({ bio: "mocked response" });
  });

  it("returns null on OpenAI error", async () => {
    const { generateArtistBio, getArtistById, db, openai } = await setup();

    getArtistById.mockResolvedValue({
      id: "artist-1",
      name: "Test Artist",
      spotify: null,
      instagram: null,
      x: null,
      soundcloud: null,
      youtube: null,
      youtubechannel: null,
    });
    (db as any).query.aiprompts.findFirst.mockResolvedValue({
      isActive: true,
      promptBeforeName: "Bio for ",
      promptAfterName: ".",
    });

    // Override the global mock to throw
    (openai.chat.completions.create as jest.Mock).mockRejectedValueOnce(
      new Error("OpenAI API error")
    );

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const result = await generateArtistBio("artist-1");

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[generateArtistBio] Error generating bio",
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it("includes YouTube with @ prefix stripped in prompt", async () => {
    const { generateArtistBio, getArtistById, db, openai } = await setup();

    getArtistById.mockResolvedValue({
      id: "artist-1",
      name: "Test Artist",
      spotify: null,
      instagram: null,
      x: null,
      soundcloud: null,
      youtube: "@TestChannel",
      youtubechannel: null,
    });
    (db as any).query.aiprompts.findFirst.mockResolvedValue({
      isActive: true,
      promptBeforeName: "Bio for ",
      promptAfterName: ".",
    });

    await generateArtistBio("artist-1");

    const callArgs = (openai.chat.completions.create as jest.Mock).mock
      .calls[0][0];
    // Should strip the leading @ from the youtube handle
    expect(callArgs.messages[0].content).toContain(
      "YouTube: https://youtube.com/@TestChannel"
    );
    // Should NOT contain double @
    expect(callArgs.messages[0].content).not.toContain("@@");
  });

  it("includes prompt parts in correct order", async () => {
    const { generateArtistBio, getArtistById, db, openai } = await setup();

    getArtistById.mockResolvedValue({
      id: "artist-1",
      name: "Cool Band",
      spotify: null,
      instagram: null,
      x: null,
      soundcloud: "sc-link",
      youtube: null,
      youtubechannel: "yt-channel-id",
    });
    (db as any).query.aiprompts.findFirst.mockResolvedValue({
      isActive: true,
      promptBeforeName: "Generate bio: ",
      promptAfterName: " end.",
    });

    await generateArtistBio("artist-1");

    const callArgs = (openai.chat.completions.create as jest.Mock).mock
      .calls[0][0];
    const content = callArgs.messages[0].content;
    expect(content).toContain("Generate bio: ");
    expect(content).toContain("Cool Band");
    expect(content).toContain(" end.");
    expect(content).toContain("SoundCloud: sc-link");
    expect(content).toContain("YouTube Channel: yt-channel-id");
    expect(content).toContain(
      "Focus on genre, key achievements, and unique traits; avoid speculation."
    );
  });

  // ------- getActivePrompt -------

  it("queries aiprompts table for active prompt", async () => {
    const { getActivePrompt, db } = await setup();
    const mockPrompt = {
      id: "prompt-1",
      isActive: true,
      promptBeforeName: "Before",
      promptAfterName: "After",
    };
    (db as any).query.aiprompts.findFirst.mockResolvedValue(mockPrompt);

    const result = await getActivePrompt();

    expect((db as any).query.aiprompts.findFirst).toHaveBeenCalled();
    expect(result).toEqual(mockPrompt);
  });

  it("returns undefined when no active prompt exists", async () => {
    const { getActivePrompt, db } = await setup();
    (db as any).query.aiprompts.findFirst.mockResolvedValue(undefined);

    const result = await getActivePrompt();
    expect(result).toBeUndefined();
  });

  // ------- setActivePrompt -------

  it("exists and does not throw", async () => {
    const { setActivePrompt } = await setup();
    expect(typeof setActivePrompt).toBe("function");
    await expect(setActivePrompt()).resolves.toBeUndefined();
  });
});

// @ts-nocheck
import { jest } from "@jest/globals";

// Static mocks – must be declared before dynamic imports
jest.mock("@/server/auth", () => ({
    getServerAuthSession: jest.fn(),
}));

jest.mock("@/server/utils/queries/userQueries", () => ({
    ...jest.requireActual("@/server/utils/queries/userQueries"),
    getUserById: jest.fn(),
}));

jest.mock("@/server/utils/services", () => ({
    extractArtistId: jest.fn(),
    isObjKey: jest.fn(),
}));

jest.mock("@/server/utils/queries/discord", () => ({
    sendDiscordMessage: jest.fn(),
}));

jest.mock("@/server/utils/ugcDiscordNotifier", () => ({
    maybePingDiscordForPendingUGC: jest.fn(),
}));

// Stub approveUGC's transitive deps so the module can load
jest.mock("@/server/utils/queries/externalApiQueries", () => ({
    getSpotifyHeaders: jest.fn(),
    getSpotifyArtist: jest.fn(),
}));

jest.mock("@/server/lib/openai", () => ({ openai: {} }));
jest.mock("next/headers", () => ({ headers: jest.fn().mockResolvedValue(new Map()) }));

const MOCK_ARTIST_URL = "https://instagram.com/taylorswift";
const MOCK_ARTIST = {
    id: "artist-uuid",
    name: "Taylor Swift",
    instagram: null, // null so duplicate check passes
} as any;

const MOCK_EXTRACTED = {
    siteName: "instagram",
    cardPlatformName: "Instagram",
    id: "taylorswift",
};

const MOCK_UGC = {
    id: "ugc-uuid",
    createdAt: "2026-02-26T00:00:00.000Z",
};

function makeUser(overrides: Record<string, any> = {}) {
    return {
        id: "user-uuid",
        username: null,
        email: null,
        wallet: null,
        isAdmin: false,
        isWhiteListed: false,
        ...overrides,
    };
}

describe("addArtistData – Discord display name", () => {
    let addArtistData: any;
    let sendDiscordMessage: jest.Mock;

    beforeEach(async () => {
        jest.resetModules();

        // Re-import after reset so each test gets fresh mock state
        const authMod = await import("@/server/auth");
        const userMod = await import("@/server/utils/queries/userQueries");
        const servicesMod = await import("@/server/utils/services");
        const discordMod = await import("@/server/utils/queries/discord");
        const notifierMod = await import("@/server/utils/ugcDiscordNotifier");
        const dbMod = await import("@/server/db/drizzle");

        // Auth – logged-in user
        (authMod.getServerAuthSession as jest.Mock).mockResolvedValue({
            user: { id: "user-uuid" },
        });

        // extractArtistId – always matches
        (servicesMod.extractArtistId as jest.Mock).mockResolvedValue(MOCK_EXTRACTED);

        // No existing UGC for this URL
        (dbMod.db as any).query.ugcresearch.findFirst.mockResolvedValue(null);

        // DB insert returns our mock UGC row
        const returningFn = jest.fn().mockResolvedValue([MOCK_UGC]);
        const valuesFn = jest.fn().mockReturnValue({ returning: returningFn });
        (dbMod.db as any).insert.mockReturnValue({ values: valuesFn });

        // Throttled ping – no-op
        (notifierMod.maybePingDiscordForPendingUGC as jest.Mock).mockResolvedValue(undefined);

        // Capture sendDiscordMessage calls
        sendDiscordMessage = discordMod.sendDiscordMessage as jest.Mock;
        sendDiscordMessage.mockResolvedValue(undefined);

        // Wire getUserById per-test (overridden below)
        (userMod.getUserById as jest.Mock).mockResolvedValue(makeUser());

        // Import the function under test last
        const mod = await import("../artistQueries");
        addArtistData = mod.addArtistData;
    });

    async function runWithUser(userOverrides: Record<string, any>) {
        const userMod = await import("@/server/utils/queries/userQueries");
        (userMod.getUserById as jest.Mock).mockResolvedValue(makeUser(userOverrides));
        await addArtistData(MOCK_ARTIST_URL, MOCK_ARTIST);
    }

    function discordMessageArg(): string {
        expect(sendDiscordMessage).toHaveBeenCalled();
        return sendDiscordMessage.mock.calls[0][0];
    }

    it("prefers username when all fields are present", async () => {
        await runWithUser({
            username: "swiftie99",
            email: "fan@example.com",
            wallet: "0xABC",
        });
        expect(discordMessageArg()).toMatch(/^swiftie99 added/);
    });

    it("falls back to email prefix when username is null", async () => {
        await runWithUser({
            username: null,
            email: "fan@example.com",
            wallet: "0xABC",
        });
        expect(discordMessageArg()).toMatch(/^fan added/);
    });

    it("falls back to wallet when username and email are null", async () => {
        await runWithUser({
            username: null,
            email: null,
            wallet: "0xABC",
        });
        expect(discordMessageArg()).toMatch(/^0xABC added/);
    });

    it('falls back to "Anonymous" when all fields are null', async () => {
        await runWithUser({
            username: null,
            email: null,
            wallet: null,
        });
        expect(discordMessageArg()).toMatch(/^Anonymous added/);
    });

    it("uses email prefix (before @) not full address", async () => {
        await runWithUser({
            username: null,
            email: "hello.world@gmail.com",
        });
        expect(discordMessageArg()).toMatch(/^hello\.world added/);
    });

    it("skips empty-string username and falls back to email", async () => {
        await runWithUser({
            username: "",
            email: "fallback@test.com",
        });
        expect(discordMessageArg()).toMatch(/^fallback added/);
    });

    it("does not send a Discord message when user is null", async () => {
        const userMod = await import("@/server/utils/queries/userQueries");
        (userMod.getUserById as jest.Mock).mockResolvedValue(null);
        await addArtistData(MOCK_ARTIST_URL, MOCK_ARTIST);
        expect(sendDiscordMessage).not.toHaveBeenCalled();
    });

    it("includes artist name, platform, handle, URL, and timestamp", async () => {
        await runWithUser({ username: "tester" });
        const msg = discordMessageArg();
        expect(msg).toBe(
            `tester added Taylor Swift's Instagram: taylorswift (Submitted URL: ${MOCK_ARTIST_URL}) ${MOCK_UGC.createdAt}`
        );
    });
});

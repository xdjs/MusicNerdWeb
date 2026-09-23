// @ts-nocheck
import { jest } from "@jest/globals";

const discoverArtistProfilesStream = jest.fn();
const applyProfileLinkDecisions = jest.fn();
jest.mock("@/server/utils/profileDiscovery", () => ({ discoverArtistProfilesStream }));
jest.mock("@/server/utils/onboarding/turnHandlers", () => ({ applyProfileLinkDecisions }));

const ID = "011645a7-a9c2-494c-a81f-2c10cdf1b756";

function stream(events: unknown[]) {
    return (async function* () { for (const e of events) yield e; })();
}

describe("writeDiscoveredProfiles", () => {
    beforeEach(() => { jest.resetModules(); discoverArtistProfilesStream.mockReset(); applyProfileLinkDecisions.mockReset(); });

    it("writes one account per platform, the first found, with identity verification on, and reports the rest as alternatives", async () => {
        discoverArtistProfilesStream.mockReturnValue(stream([
            { kind: "searching", platform: "instagram", displayName: "Instagram" },
            { kind: "found", profile: { siteName: "instagram", profileUrl: "https://instagram.com/blackdave.xyz", provisional: false } },
            { kind: "found", profile: { siteName: "instagram", profileUrl: "https://instagram.com/blackdavemk2", provisional: false } },
            { kind: "found", profile: { siteName: "x", profileUrl: "https://x.com/BlackDave", provisional: true } },
            { kind: "checked", platform: "x", displayName: "X" },
        ]));
        applyProfileLinkDecisions.mockResolvedValue({ written: ["instagram", "x"] });
        const { writeDiscoveredProfiles } = await import("@/server/utils/evals/writeDiscoveredProfiles");
        const result = await writeDiscoveredProfiles(ID);
        expect(applyProfileLinkDecisions).toHaveBeenCalledTimes(1);
        expect(applyProfileLinkDecisions).toHaveBeenCalledWith(
            ID,
            [{ url: "https://instagram.com/blackdave.xyz" }, { url: "https://x.com/BlackDave" }],
            [],
            { verifyIdentity: true },
        );
        expect(result).toEqual({ found: 3, alternatives: 1, provisionalSiteNames: ["x"], discoveryError: null });
    });

    it("counts a provisional guess as provisional only when it was actually written", async () => {
        discoverArtistProfilesStream.mockReturnValue(stream([
            { kind: "found", profile: { siteName: "x", profileUrl: "https://x.com/BlackDave", provisional: true } },
        ]));
        applyProfileLinkDecisions.mockResolvedValue({ written: [] });
        const { writeDiscoveredProfiles } = await import("@/server/utils/evals/writeDiscoveredProfiles");
        expect((await writeDiscoveredProfiles(ID)).provisionalSiteNames).toEqual([]);
    });

    it("writes nothing when discovery found nothing", async () => {
        discoverArtistProfilesStream.mockReturnValue(stream([{ kind: "checked", platform: "instagram", displayName: "Instagram" }]));
        const { writeDiscoveredProfiles } = await import("@/server/utils/evals/writeDiscoveredProfiles");
        expect(await writeDiscoveredProfiles(ID)).toEqual({ found: 0, alternatives: 0, provisionalSiteNames: [], discoveryError: null });
        expect(applyProfileLinkDecisions).not.toHaveBeenCalled();
    });

    it("records a discovery failure instead of throwing, so the case still gets scored", async () => {
        discoverArtistProfilesStream.mockReturnValue((async function* () { throw new Error("rate limited"); })());
        const { writeDiscoveredProfiles } = await import("@/server/utils/evals/writeDiscoveredProfiles");
        expect(await writeDiscoveredProfiles(ID)).toEqual({ found: 0, alternatives: 0, provisionalSiteNames: [], discoveryError: "rate limited" });
    });
});

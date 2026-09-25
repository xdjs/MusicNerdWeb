import { adoptedProfiles } from "@/server/utils/onboarding/adoptedProfiles";

const urlmap = [
    { siteName: "bandcamp", cardPlatformName: "Bandcamp", siteImage: "https://img/bandcamp.svg", colorHex: "#1da0c3", appStringFormat: "https://%@.bandcamp.com" },
    { siteName: "instagram", cardPlatformName: "Instagram", siteImage: null, colorHex: "#000000", appStringFormat: "https://instagram.com/%@" },
    { siteName: "discogs", cardPlatformName: "Discogs", siteImage: null, colorHex: null, appStringFormat: null },
];

describe("adoptedProfiles", () => {
    it("returns each link column the search filled or changed, presented like a discovered profile", () => {
        const before = { name: "Bio Ritmo", bandcamp: null, instagram: "guess", spotify: "sp1" };
        const after = { name: "Bio Ritmo", bandcamp: "bioritmo", instagram: "bioritmo", spotify: "sp1" };
        expect(adoptedProfiles(before, after, urlmap)).toEqual([
            { siteName: "bandcamp", displayName: "Bandcamp", value: "bioritmo", profileUrl: "https://bioritmo.bandcamp.com", logoUrl: "https://img/bandcamp.svg", colorHex: "#1da0c3", previewImage: null, reasoning: null, provisional: false },
            { siteName: "instagram", displayName: "Instagram", value: "bioritmo", profileUrl: "https://instagram.com/bioritmo", logoUrl: null, colorHex: null, previewImage: null, reasoning: null, provisional: false },
        ]);
    });

    it("leaves out unchanged columns, cleared ones, non-link columns and links with nowhere to go", () => {
        const before = { name: "Bio Ritmo", bandcamp: "bioritmo", instagram: "x", discogs: null };
        const after = { name: "Bio Ritmo!", bandcamp: "bioritmo", instagram: null, discogs: "333934" };
        expect(adoptedProfiles(before, after, urlmap)).toEqual([]);
    });

    it("is empty when either read failed", () => {
        expect(adoptedProfiles(undefined, { bandcamp: "b" }, urlmap)).toEqual([]);
        expect(adoptedProfiles({ bandcamp: null }, undefined, urlmap)).toEqual([]);
    });
});

import { foundProfiles } from "@/lib/onboarding/foundProfiles";

const profile = (siteName: string, value: string) => ({
    siteName, displayName: siteName, value,
    profileUrl: `https://${siteName}.com/${value}`, logoUrl: null, previewImage: null,
});
const candidate = (siteName: string, value: string) => ({ kind: "candidates", candidates: [profile(siteName, value)] });
const linked = (...profiles: ReturnType<typeof profile>[]) => ({ kind: "linked", candidates: profiles });

describe("foundProfiles", () => {
    it("shows discovery's candidates live, before anything is written", () => {
        expect(foundProfiles([
            { kind: "candidates", candidates: [profile("spotify", "bio"), profile("youtube", "bioritmo")] },
        ]).map(p => p.siteName)).toEqual(["spotify", "youtube"]);
    });

    it("once the build writes, shows exactly what it wrote, dropping refused candidates and second accounts", () => {
        expect(foundProfiles([
            { kind: "candidates", candidates: [profile("spotify", "bio"), profile("instagram", "blocked"), profile("spotify", "other")] },
            linked(profile("spotify", "bio")),
        ])).toEqual([profile("spotify", "bio")]);
    });

    it("merges later writes by platform, the latest one winning, in first-seen order", () => {
        expect(foundProfiles([
            linked(profile("spotify", "bio"), profile("instagram", "guess")),
            linked(profile("instagram", "bioritmo"), profile("bandcamp", "bioritmo")),
        ]).map(p => `${p.siteName}=${p.value}`)).toEqual(["spotify=bio", "instagram=bioritmo", "bandcamp=bioritmo"]);
    });

    it("returns nothing before discovery reports, and ignores other items", () => {
        expect(foundProfiles([])).toEqual([]);
        expect(foundProfiles([{ kind: "progress", group: "platform-search", text: "Finding your profiles" }, candidate("spotify", "bio")]))
            .toEqual([profile("spotify", "bio")]);
    });
});

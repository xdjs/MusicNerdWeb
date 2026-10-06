import { newKeys } from "@/lib/onboarding/newKeys";

describe("newKeys", () => {
    it("lists what the page shows now that it didn't have when the build started, in page order", () => {
        expect(newKeys(["deezer"], ["spotify", "deezer", "instagram"])).toEqual(["spotify", "instagram"]);
    });

    it("is empty when nothing new arrived", () => {
        expect(newKeys(["deezer"], ["deezer"])).toEqual([]);
        expect(newKeys([], [])).toEqual([]);
    });
});

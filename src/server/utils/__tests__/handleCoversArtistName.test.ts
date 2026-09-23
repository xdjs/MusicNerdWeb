import { handleCoversArtistName } from "@/server/utils/handleCoversArtistName";

describe("handleCoversArtistName", () => {
    it.each([
        ["peterango", "Pete Rango"],
        ["peterangomusic", "Pete Rango"],
        ["p3t3rango", "Pete Rango"], // a digit for a letter, because the plain name was taken
        ["Grimes", "Grimes"],
        ["blackkeys", "The Black Keys"], // articles are optional in a handle
        ["blackdavemk2", "Black Dave MK2"],
        ["pharaoh.sistare", "Pharaoh Sistare"],
    ])("accepts %s for %s", (handle, name) => {
        expect(handleCoversArtistName(handle, name)).toBe(true);
    });

    it.each([
        // A handle that is one word of a longer name is somebody else often enough to
        // refuse: Exa returned Lee Brice's accounts for "Sherwinn Dupes Brice" (#1340).
        ["brice", "Sherwinn Dupes Brice"],
        ["blackdave", "Black Dave MK2"], // a namesake in our own directory
        ["grime", "Grimes"],
        ["inoise", "shumov"], // zero relation
        ["", "Pete Rango"],
    ])("rejects %s for %s", (handle, name) => {
        expect(handleCoversArtistName(handle, name)).toBe(false);
    });

    it("rejects everything for a name with no letters or digits to match", () => {
        expect(handleCoversArtistName("anything", "✨✨")).toBe(false);
    });
});

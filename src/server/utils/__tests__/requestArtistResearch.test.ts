jest.mock("@/server/utils/queries/researchJobQueries", () => ({ enqueueResearchJob: jest.fn(async () => true) }));
import { requestArtistResearch } from "../requestArtistResearch";
import { enqueueResearchJob } from "@/server/utils/queries/researchJobQueries";

describe("requestArtistResearch", () => {
    it("queues a scrape of the artist's feed", async () => {
        expect(await requestArtistResearch("a1")).toBe(true);
        expect(enqueueResearchJob).toHaveBeenCalledWith("a1", "social_ingest", { state: {} });
    });

    it("forces the scrape when the artist asked", async () => {
        await requestArtistResearch("a1", { force: true });
        expect(enqueueResearchJob).toHaveBeenLastCalledWith("a1", "social_ingest", { state: { force: true } });
    });
});

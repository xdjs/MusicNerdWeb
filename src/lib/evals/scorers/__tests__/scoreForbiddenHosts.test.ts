import { scoreForbiddenHosts } from "@/lib/evals/scorers/scoreForbiddenHosts";

jest.mock("@/lib/source/sourceAuthority", () => ({
    isBlockedSourceHost: (url: string) => url.includes("blocked.example"),
}));

describe("scoreForbiddenHosts", () => {
    it("scores 1 when no kept source is a namesake or a blocked host", () => {
        const result = scoreForbiddenHosts(
            ["https://peterango.bandcamp.com/", "https://www.instagram.com/p3t3rango/"],
            ["screenrant.com", "allmusic.com"],
        );
        expect(result).toEqual({ name: "forbidden_hosts", score: 1, metadata: { kept: 2, namesake: [], blocked: [] } });
    });

    it("scores 0 when a namesake host was stored, and names it", () => {
        const result = scoreForbiddenHosts(
            ["https://screenrant.com/rango-soundtrack/", "https://peterango.bandcamp.com/"],
            ["screenrant.com"],
        );
        expect(result.score).toBe(0);
        expect(result.metadata.namesake).toEqual(["https://screenrant.com/rango-soundtrack/"]);
    });

    it("scores 0 for a blocked host, judged by the pipeline's own list", () => {
        const result = scoreForbiddenHosts(["https://blocked.example/page"], []);
        expect(result.score).toBe(0);
        expect(result.metadata.blocked).toEqual(["https://blocked.example/page"]);
    });

    it("scores 1 when nothing was kept at all", () => {
        expect(scoreForbiddenHosts([], ["screenrant.com"]).score).toBe(1);
    });
});

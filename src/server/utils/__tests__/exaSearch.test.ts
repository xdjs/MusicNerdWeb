// @ts-nocheck
import { jest } from "@jest/globals";

async function load(key = "exa-test-key") {
    jest.resetModules();
    jest.doMock("@/env", () => ({ EXA_API_KEY: key }));
    return (await import("../exaSearch")).exaSearch;
}

const ok = (body: unknown) => async () => ({ ok: true, json: async () => body });

describe("exaSearch", () => {
    const realFetch = global.fetch;
    beforeEach(() => { jest.spyOn(console, "error").mockImplementation(() => {}); });
    afterEach(() => { global.fetch = realFetch; jest.restoreAllMocks(); jest.dontMock("@/env"); jest.resetModules(); });

    it("POSTs to api.exa.ai/search with x-api-key, numResults, includeDomains and highlights", async () => {
        let url, init;
        global.fetch = jest.fn(async (u, i) => { url = u; init = i; return { ok: true, json: async () => ({ results: [] }) }; });
        const exaSearch = await load("exa-secret-123");

        await exaSearch("Pete Rango music artist", { includeDomains: ["instagram.com"], maxResults: 3 });

        expect(url).toBe("https://api.exa.ai/search");
        expect(init.method).toBe("POST");
        expect(init.headers).toMatchObject({ "Content-Type": "application/json", "x-api-key": "exa-secret-123" });
        expect(JSON.parse(init.body)).toEqual({
            query: "Pete Rango music artist",
            numResults: 3,
            includeDomains: ["instagram.com"],
            contents: { highlights: { maxCharacters: 600 } },
        });
        expect(init.signal).toBeDefined();
    });

    it("leaves includeDomains out when there is no domain filter", async () => {
        let init;
        global.fetch = jest.fn(async (_u, i) => { init = i; return { ok: true, json: async () => ({ results: [] }) }; });
        const exaSearch = await load();

        await exaSearch("q", { includeDomains: [], maxResults: 5 });

        expect(JSON.parse(init.body)).not.toHaveProperty("includeDomains");
    });

    it("maps rows to WebSearchResult, joining highlights into the snippet", async () => {
        global.fetch = jest.fn(ok({ results: [
            { title: "Pete Rango (@p3t3rango)", url: "https://www.instagram.com/p3t3rango/", highlights: ["Music producer.", "Richmond, VA."] },
        ] }));
        const exaSearch = await load();

        await expect(exaSearch("q", { includeDomains: [], maxResults: 5 })).resolves.toEqual({
            results: [{ title: "Pete Rango (@p3t3rango)", url: "https://www.instagram.com/p3t3rango/", snippet: "Music producer. … Richmond, VA." }],
        });
    });

    it("drops rows without a url and degrades a missing title or highlights to empty strings", async () => {
        global.fetch = jest.fn(ok({ results: [{ title: "no url" }, { url: "https://a.example", title: null }] }));
        const exaSearch = await load();

        await expect(exaSearch("q", { includeDomains: [], maxResults: 5 }))
            .resolves.toEqual({ results: [{ url: "https://a.example", title: "", snippet: "" }] });
    });

    it.each([
        ["no_response", async () => { throw new Error("network down"); }],
        ["http_402", async () => ({ ok: false, status: 402, text: async () => '{"error":"out of credits"}' })],
        ["unparseable", async () => ({ ok: true, json: async () => { throw new Error("not json"); } })],
        ["no_results", async () => ({ ok: true, json: async () => ({ results: "nope" }) })],
    ])("never throws: %s degrades to no results and names the failure", async (error, impl) => {
        global.fetch = jest.fn(impl);
        const exaSearch = await load();

        await expect(exaSearch("q", { includeDomains: [], maxResults: 5 })).resolves.toEqual({ results: [], error });
    });

    it("logs Exa's reason on an HTTP error", async () => {
        global.fetch = jest.fn(async () => ({ ok: false, status: 402, text: async () => '{"error":"out of credits"}' }));
        const exaSearch = await load();

        await exaSearch("q", { includeDomains: [], maxResults: 5 });

        const logged = console.error.mock.calls.flat().join(" ");
        expect(logged).toMatch(/402/);
        expect(logged).toMatch(/out of credits/);
    });
});

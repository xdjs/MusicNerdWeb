import { savedSources } from "@/lib/onboarding/savedSources";

const src = (url: string) => ({ title: url, url, ogImage: null });

describe("savedSources", () => {
    it("lists sources as they are saved, once each, with no total yet", () => {
        expect(savedSources([
            { kind: "source", saved: [src("https://a.com/1")] },
            { kind: "progress", group: "source-search", text: "Reading" },
            { kind: "source", saved: [src("https://b.com/2")] },
            { kind: "source", saved: [src("https://a.com/1")] },
        ])).toEqual({ sources: [src("https://a.com/1"), src("https://b.com/2")], total: null });
    });

    it("once the stage ends, shows the ones just saved first, then the rest of the page, and the total", () => {
        expect(savedSources([
            { kind: "source", saved: [src("https://b.com/2")] },
            { kind: "sources", saved: [src("https://c.com/old"), src("https://b.com/2"), src("https://a.com/1")] },
        ])).toEqual({ sources: [src("https://b.com/2"), src("https://c.com/old"), src("https://a.com/1")], total: 3 });
    });

    it("is empty before anything is saved", () => {
        expect(savedSources([])).toEqual({ sources: [], total: null });
        expect(savedSources([{ kind: "sources", saved: [] }])).toEqual({ sources: [], total: 0 });
    });
});

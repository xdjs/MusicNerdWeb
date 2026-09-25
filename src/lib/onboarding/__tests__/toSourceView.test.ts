import { toSourceView } from "@/lib/onboarding/toSourceView";

describe("toSourceView", () => {
    it("keeps only what the research view shows: the title, the URL and the share image", () => {
        const saved = { id: "s1", url: "https://a.com/1", title: "Bio Ritmo", ogImage: "https://a.com/og.jpg", extractedText: "long", snippet: "s" };
        expect(toSourceView(saved))
            .toEqual({ title: "Bio Ritmo", url: "https://a.com/1", ogImage: "https://a.com/og.jpg" });
    });

    it("says null for a missing title or image", () => {
        expect(toSourceView({ url: "https://a.com/1" })).toEqual({ title: null, url: "https://a.com/1", ogImage: null });
    });
});

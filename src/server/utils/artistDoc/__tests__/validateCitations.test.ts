import { validateCitations } from "@/server/utils/artistDoc/validateCitations";
import type { DocSource } from "@/server/utils/artistDocService";

const sources = [
    { id: 1, kind: "vault", label: "Pitchfork review", url: "https://pitchfork.com/x", publishedAt: null },
    { id: 2, kind: "interview", label: "Their own words", url: null },
] as DocSource[];

describe("validateCitations", () => {
    it("keeps markers that resolve to a real source and strips ones that do not", () => {
        expect(validateCitations("Cited Lauryn Hill[1], in their words[2], and more[99].", sources))
            .toBe("Cited Lauryn Hill[1], in their words[2], and more.");
    });

    it("strips all-caps bracket tokens the model cites as if they were sources", () => {
        expect(validateCitations("Released in 2019 [VERIFIED CATALOG].", sources)).toBe("Released in 2019.");
    });

    it("leaves ordinary bracketed prose alone", () => {
        expect(validateCitations("A remix [with strings] followed[1].", sources)).toBe("A remix [with strings] followed[1].");
    });

    it("removes our own 'date unknown' label when the model copies it into the text", () => {
        expect(validateCitations('"Vi$ions" (date unknown) was his first single[1].', sources))
            .toBe('"Vi$ions" was his first single[1].');
    });
});

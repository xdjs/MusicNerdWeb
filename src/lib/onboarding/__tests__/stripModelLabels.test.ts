import { stripModelLabels } from "@/lib/onboarding/stripModelLabels";

describe("stripModelLabels", () => {
    it("removes all-caps bracket labels the model copies from its own material", () => {
        expect(stripModelLabels('released the single "Largos Caminos" on June 24, 2025 [VERIFIED CATALOG].'))
            .toBe('released the single "Largos Caminos" on June 24, 2025.');
    });

    it("removes the 'date unknown' label the model sometimes copies in", () => {
        expect(stripModelLabels('"Vi$ions" (date unknown) was his first single [1].')).toBe('"Vi$ions" was his first single [1].');
    });

    it("leaves citations and ordinary bracketed prose alone", () => {
        expect(stripModelLabels("a remix [with strings] followed [1][2].")).toBe("a remix [with strings] followed [1][2].");
    });
});

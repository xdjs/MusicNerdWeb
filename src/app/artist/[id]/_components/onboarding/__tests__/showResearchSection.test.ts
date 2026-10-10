import { showResearchSection } from "../showResearchSection";

describe("showResearchSection", () => {
    const scrollIntoView = jest.fn();
    let reduced = false;

    beforeEach(() => {
        scrollIntoView.mockClear();
        reduced = false;
        document.body.innerHTML = '<div id="mn-links"></div><div id="mn-lore"></div><div id="mn-about"></div>';
        Element.prototype.scrollIntoView = scrollIntoView;
        window.matchMedia = jest.fn().mockImplementation(() => ({ matches: reduced })) as never;
    });

    it("smooth-scrolls to the step's section", () => {
        showResearchSection("vault");
        expect(scrollIntoView).toHaveBeenCalledTimes(1);
        expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById("mn-lore"));
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    });

    it("jumps with reduced motion", () => {
        reduced = true;
        showResearchSection("publish");
        expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById("mn-about"));
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "instant", block: "start" });
    });

    it("does nothing without a step", () => {
        showResearchSection(null);
        expect(scrollIntoView).not.toHaveBeenCalled();
    });
});

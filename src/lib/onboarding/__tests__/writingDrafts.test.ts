import { writingDrafts } from "@/lib/onboarding/writingDrafts";

const writing = (stage: "doc" | "about", text: string) => ({ kind: "writing", stage, text });

describe("writingDrafts", () => {
    it("labels each draft and puts the Lore document before the About, whatever order they arrived in", () => {
        expect(writingDrafts([writing("about", "An About."), writing("doc", "## Overview")])).toEqual([
            { label: "Lore document", text: "## Overview" },
            { label: "About", text: "An About." },
        ]);
    });

    it("leaves out a draft that has not started", () => {
        expect(writingDrafts([writing("doc", "## Overview")])).toEqual([{ label: "Lore document", text: "## Overview" }]);
    });

    it("returns nothing before anything has been written, and ignores other items", () => {
        expect(writingDrafts([])).toEqual([]);
        expect(writingDrafts([{ kind: "progress", group: "about-write", text: "Writing your About" }, writing("doc", "")])).toEqual([]);
    });
});

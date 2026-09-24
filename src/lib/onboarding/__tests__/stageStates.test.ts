import { stageStates } from "@/lib/onboarding/stageStates";

const progress = (group: string, text: string, done: boolean) => ({ kind: "progress", group, text, done });

describe("stageStates", () => {
    it("lists the three build stages in order, all pending before anything reports", () => {
        expect(stageStates([])).toEqual([
            { group: "platform-search", label: "Finding your profiles", state: "pending" },
            { group: "source-search", label: "Reading what people wrote about you", state: "pending" },
            { group: "about-write", label: "Writing your About", state: "pending" },
        ]);
    });

    it("marks a reported stage active, keeping the generic label until it finishes", () => {
        expect(stageStates([progress("platform-search", "Searching 12 platforms", false)])[0])
            .toEqual({ group: "platform-search", label: "Finding your profiles", state: "active" });
    });

    it("replaces a finished stage's label with the count it reported", () => {
        expect(stageStates([progress("platform-search", "Found 7 profiles", true)])[0])
            .toEqual({ group: "platform-search", label: "Found 7 profiles", state: "done" });
    });

    it("ignores items that are not progress, and groups it does not know", () => {
        const states = stageStates([
            { kind: "writing", stage: "doc", text: "draft" },
            progress("unknown-group", "Whatever", true),
        ]);
        expect(states.map(s => s.state)).toEqual(["pending", "pending", "pending"]);
    });
});

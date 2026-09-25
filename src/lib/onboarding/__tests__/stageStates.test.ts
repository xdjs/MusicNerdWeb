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

    it("marks the stage that was running as failed when the build ends on an error", () => {
        const states = stageStates([
            progress("platform-search", "Found 7 profiles", true),
            progress("source-search", "Read 17 sources", true),
            progress("about-write", "Writing your About", false),
            { kind: "error", text: "Could not publish your About and Lore." },
        ]);
        expect(states.map(s => s.state)).toEqual(["done", "done", "error"]);
    });

    it("marks the first unfinished stage as failed when the error comes before it reports", () => {
        const states = stageStates([
            progress("platform-search", "Found 7 profiles", true),
            { kind: "error", text: "Something went wrong" },
        ]);
        expect(states.map(s => s.state)).toEqual(["done", "error", "pending"]);
    });

    // "Try again" after a dropped connection: the server finished the build
    // meanwhile, so the new turn answers `complete` without replaying progress.
    it("marks every stage done once the build completes, even one that never reported done", () => {
        const states = stageStates([
            progress("platform-search", "Found 5 profiles", true),
            progress("source-search", "Looked for sources about you", true),
            progress("about-write", "Writing your About", false),
            { kind: "error", text: "Connection dropped" },
            { kind: "complete" },
        ]);
        expect(states.map(s => s.state)).toEqual(["done", "done", "done"]);
    });
});

import { buildFailure } from "@/lib/onboarding/buildFailure";

describe("buildFailure", () => {
    it("reports the error when the build's last item is one", () => {
        expect(buildFailure([
            { kind: "progress", group: "about-write", text: "Writing your About", done: false },
            { kind: "writing", stage: "doc", text: "## overview" },
            { kind: "error", text: "Could not publish your About and Lore." },
        ])).toEqual({ message: "Could not publish your About and Lore." });
    });

    it("clears once a retry starts appending again", () => {
        expect(buildFailure([
            { kind: "error", text: "Could not publish your About and Lore." },
            { kind: "bot", text: "Your profile is yours. Building your page now." },
        ])).toBeNull();
    });

    it("is null for a build that is running or finished", () => {
        expect(buildFailure([])).toBeNull();
        expect(buildFailure([{ kind: "progress", group: "platform-search", text: "Found 7 profiles", done: true }, { kind: "complete" }])).toBeNull();
    });
});

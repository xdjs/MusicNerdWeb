import { unreachableNote } from "@/lib/onboarding/unreachableNote";

describe("unreachableNote", () => {
    it("says one refused platform plainly, lowercase, and that it isn't a no", () => {
        expect(unreachableNote([{ kind: "unreachable", platforms: ["Instagram"] }]))
            .toBe("instagram wouldn’t let us look just now, so that’s not a “no”. you can add it from your page.");
    });

    it("joins several and says them", () => {
        expect(unreachableNote([{ kind: "unreachable", platforms: ["Instagram", "TikTok", "Twitch"] }]))
            .toBe("instagram, tiktok and twitch wouldn’t let us look just now, so that’s not a “no”. you can add them from your page.");
    });

    it("is null when every platform answered", () => {
        expect(unreachableNote([])).toBeNull();
        expect(unreachableNote([{ kind: "unreachable", platforms: [] }])).toBeNull();
    });
});

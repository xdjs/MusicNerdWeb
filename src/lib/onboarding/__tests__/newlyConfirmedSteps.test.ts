import { newlyConfirmedSteps } from "@/lib/onboarding/newlyConfirmedSteps";

const none = { profiles: null, vault: null, interview: null, publish: null };

describe("newlyConfirmedSteps", () => {
    it("names the steps that gained a confirmation time since the last poll", () => {
        const prev = { ...none, profiles: "2026-10-02T23:33:42.122Z" };
        const next = { ...prev, vault: "2026-10-02T23:33:46.437Z" };
        expect(newlyConfirmedSteps(prev, next)).toEqual(["vault"]);
    });

    it("names several at once, in step order (interview and publish land together)", () => {
        const prev = { ...none, profiles: "a", vault: "b" };
        const next = { ...prev, interview: "c", publish: "c" };
        expect(newlyConfirmedSteps(prev, next)).toEqual(["interview", "publish"]);
    });

    it("is empty when nothing changed", () => {
        expect(newlyConfirmedSteps(none, none)).toEqual([]);
    });
});

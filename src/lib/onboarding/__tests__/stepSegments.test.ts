import { stepSegments } from "@/lib/onboarding/stepSegments";

const none = { profiles: null, vault: null, interview: null, publish: null };

describe("stepSegments", () => {
    it("marks Links running at the start", () => {
        expect(stepSegments(none, "profiles")).toEqual([
            { label: "Links", state: "active" },
            { label: "Lore", state: "waiting" },
            { label: "About", state: "waiting" },
        ]);
    });

    it("marks confirmed steps done and the current one running", () => {
        expect(stepSegments({ ...none, profiles: "t1" }, "vault").map(s => s.state)).toEqual(["done", "active", "waiting"]);
    });

    it("counts the interview step as the About", () => {
        expect(stepSegments({ ...none, profiles: "t1", vault: "t2" }, "interview").map(s => s.state)).toEqual(["done", "done", "active"]);
    });

    it("marks everything done once publish is confirmed", () => {
        expect(stepSegments({ profiles: "a", vault: "b", interview: "c", publish: "c" }, null).map(s => s.state)).toEqual(["done", "done", "done"]);
    });
});

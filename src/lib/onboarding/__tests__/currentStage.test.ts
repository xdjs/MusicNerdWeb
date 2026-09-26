import { currentStage } from "@/lib/onboarding/currentStage";

const stage = (group: string, state: "pending" | "active" | "done" | "error") => ({ group, label: group, state });

describe("currentStage", () => {
    it("is the stage that is running", () => {
        expect(currentStage([stage("a", "done"), stage("b", "active"), stage("c", "pending")])?.group).toBe("b");
    });

    it("is the stage that failed", () => {
        expect(currentStage([stage("a", "done"), stage("b", "error"), stage("c", "pending")])?.group).toBe("b");
    });

    it("is the next stage to start when none is running yet", () => {
        expect(currentStage([stage("a", "done"), stage("b", "pending")])?.group).toBe("b");
        expect(currentStage([stage("a", "pending"), stage("b", "pending")])?.group).toBe("a");
    });

    it("is null once every stage is done", () => {
        expect(currentStage([stage("a", "done"), stage("b", "done")])).toBeNull();
    });
});

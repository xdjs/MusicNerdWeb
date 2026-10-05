import { render, screen } from "@testing-library/react";
import ResearchPending from "../ResearchPending";
import { OnboardingProgressContext } from "../OnboardingProgressContext";

const none = { profiles: null, vault: null, interview: null, publish: null };
const inBuild = (steps: typeof none | Record<string, string | null>, ui: React.ReactNode) =>
    render(<OnboardingProgressContext.Provider value={steps as typeof none}>{ui}</OnboardingProgressContext.Provider>);

describe("ResearchPending", () => {
    it("shows the loading line above the section while its step isn't confirmed", () => {
        inBuild(none, <ResearchPending step="profiles" label="finding your profiles…"><p>links</p></ResearchPending>);
        expect(screen.getByRole("status")).toHaveTextContent("finding your profiles…");
        expect(screen.getByText("links")).toBeInTheDocument();
    });

    it("with hideUntilDone, shows the loading line instead of the section", () => {
        inBuild(none, <ResearchPending step="publish" label="writing your about…" hideUntilDone><p>about</p></ResearchPending>);
        expect(screen.getByRole("status")).toHaveTextContent("writing your about…");
        expect(screen.queryByText("about")).not.toBeInTheDocument();
    });

    it("shows just the section once its step is confirmed", () => {
        inBuild({ ...none, vault: "2026-10-02T23:33:46.437Z" }, <ResearchPending step="vault" label="reading…"><p>lore</p></ResearchPending>);
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        expect(screen.getByText("lore")).toBeInTheDocument();
    });

    it("shows just the section when no build is being watched", () => {
        render(<ResearchPending step="publish" label="writing…" hideUntilDone><p>about</p></ResearchPending>);
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        expect(screen.getByText("about")).toBeInTheDocument();
    });
});

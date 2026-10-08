import { fireEvent, render, screen, within } from "@testing-library/react";
import ResearchStatusBar from "../ResearchStatusBar";

const none = { profiles: null, vault: null, interview: null, publish: null };
const base = { steps: none, currentStep: "profiles" as const, complete: false, summary: "", failure: null, onSkip: jest.fn(), onRetry: jest.fn(), onSeeResults: jest.fn() };

describe("ResearchStatusBar", () => {
    it("names the current step, shows the three segments, and offers skip", () => {
        const onSkip = jest.fn();
        render(<ResearchStatusBar {...base} steps={{ ...none, profiles: "t1" }} currentStep="vault" onSkip={onSkip} />);
        expect(screen.getByText("reading what’s written about you…")).toHaveAttribute("aria-live", "polite");
        const steps = within(screen.getByRole("list", { name: "Research steps" })).getAllByRole("listitem");
        expect(steps.map(s => s.textContent)).toEqual(["Links done", "Lore", "About"]);
        expect(steps[1]).toHaveAttribute("aria-current", "step");
        const skip = screen.getByRole("button", { name: "skip for now" });
        expect(skip).toHaveClass("hover:bg-accent");
        fireEvent.click(skip);
        expect(onSkip).toHaveBeenCalled();
    });

    it("turns into the ready card when the build is complete, linking to what changed", () => {
        const onSeeResults = jest.fn();
        render(<ResearchStatusBar {...base} complete currentStep={null} summary="We found 6 profiles and 3 sources, and wrote your About." onSeeResults={onSeeResults} />);
        expect(screen.getByText("Your page is ready")).toBeInTheDocument();
        expect(screen.getByText("We found 6 profiles and 3 sources, and wrote your About.")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "skip for now" })).not.toBeInTheDocument();
        const see = screen.getByRole("button", { name: "See what we found" });
        expect(see).toHaveClass("button-pink");
        fireEvent.click(see);
        expect(onSeeResults).toHaveBeenCalled();
    });

    it("shows a failure with try again instead", () => {
        const onRetry = jest.fn();
        render(<ResearchStatusBar {...base} failure="This is taking longer than usual." onRetry={onRetry} />);
        expect(screen.getByRole("alert")).toHaveTextContent("This is taking longer than usual.");
        expect(screen.queryByRole("button", { name: "skip for now" })).not.toBeInTheDocument();
        const retry = screen.getByRole("button", { name: "try again" });
        expect(retry).toHaveClass("bg-primary");
        fireEvent.click(retry);
        expect(onRetry).toHaveBeenCalled();
    });
});

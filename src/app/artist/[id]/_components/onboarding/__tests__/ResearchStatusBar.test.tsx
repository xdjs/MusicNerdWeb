import { fireEvent, render, screen, within } from "@testing-library/react";
import ResearchStatusBar from "../ResearchStatusBar";

const none = { profiles: null, vault: null, interview: null, publish: null };
const base = { steps: none, currentStep: "profiles" as const, complete: false, failure: null, onSkip: jest.fn(), onRetry: jest.fn() };

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

    it("renders nothing once the build is complete, leaving the page to the tour", () => {
        const { container } = render(<ResearchStatusBar {...base} complete currentStep={null} />);
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByText("Your page is ready")).not.toBeInTheDocument();
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

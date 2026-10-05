import { fireEvent, render, screen } from "@testing-library/react";
import ResearchStatusBar from "../ResearchStatusBar";

describe("ResearchStatusBar", () => {
    it("names the current step and offers skip", () => {
        const onSkip = jest.fn();
        render(<ResearchStatusBar step="vault" failure={null} onSkip={onSkip} onRetry={jest.fn()} />);
        expect(screen.getByText("reading what’s written about you…")).toHaveAttribute("aria-live", "polite");
        fireEvent.click(screen.getByRole("button", { name: "skip for now" }));
        expect(onSkip).toHaveBeenCalled();
    });

    it("shows a failure with try again instead", () => {
        const onRetry = jest.fn();
        render(<ResearchStatusBar step="vault" failure="This is taking longer than usual." onSkip={jest.fn()} onRetry={onRetry} />);
        expect(screen.getByRole("alert")).toHaveTextContent("This is taking longer than usual.");
        expect(screen.queryByRole("button", { name: "skip for now" })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "try again" }));
        expect(onRetry).toHaveBeenCalled();
    });
});

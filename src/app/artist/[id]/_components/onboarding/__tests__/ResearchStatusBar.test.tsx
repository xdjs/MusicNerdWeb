import { fireEvent, render, screen, within } from "@testing-library/react";
import ResearchStatusBar from "../ResearchStatusBar";
import { showResearchSection } from "../showResearchSection";

jest.mock("../showResearchSection", () => ({ showResearchSection: jest.fn() }));

const none = { profiles: null, vault: null, interview: null, publish: null };
const base = { steps: none, currentStep: "profiles" as const, complete: false, failure: null, onRetry: jest.fn() };

describe("ResearchStatusBar", () => {
    beforeEach(() => jest.mocked(showResearchSection).mockClear());

    it("floats where the Ask button sits, with the current step and the three segments, and no skip", () => {
        render(<ResearchStatusBar {...base} steps={{ ...none, profiles: "t1" }} currentStep="vault" />);
        const pill = screen.getByRole("region", { name: "Research status" });
        expect(pill).toHaveClass("fixed", "bottom-[max(1rem,env(safe-area-inset-bottom))]", "right-4", "sm:right-8");
        expect(screen.getByText("reading what’s written about you…")).toHaveAttribute("aria-live", "polite");
        const steps = within(screen.getByRole("list", { name: "Research steps" })).getAllByRole("listitem");
        expect(steps.map(s => s.textContent)).toEqual(["Links done", "Lore", "About"]);
        expect(steps[1]).toHaveAttribute("aria-current", "step");
        expect(screen.queryByRole("button", { name: /skip/i })).not.toBeInTheDocument();
    });

    it("takes the artist to the section being researched only when they click it", () => {
        render(<ResearchStatusBar {...base} currentStep="vault" />);
        expect(showResearchSection).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", { name: /reading what’s written about you…/ }));
        expect(showResearchSection).toHaveBeenCalledWith("vault");
    });

    it("renders nothing once the build is complete, leaving the page to the tour", () => {
        const { container } = render(<ResearchStatusBar {...base} complete currentStep={null} />);
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByText("Your page is ready")).not.toBeInTheDocument();
    });

    it("shows a failure with try again in the same place", () => {
        const onRetry = jest.fn();
        render(<ResearchStatusBar {...base} failure="This is taking longer than usual." onRetry={onRetry} />);
        expect(screen.getByRole("region", { name: "Research status" })).toHaveClass("fixed");
        expect(screen.getByRole("alert")).toHaveTextContent("This is taking longer than usual.");
        fireEvent.click(screen.getByRole("button", { name: "try again" }));
        expect(onRetry).toHaveBeenCalled();
        expect(showResearchSection).not.toHaveBeenCalled();
    });
});

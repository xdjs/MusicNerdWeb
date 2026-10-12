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

    it("says which of the three steps is running, and sweeps only the running segment", () => {
        const { container } = render(<ResearchStatusBar {...base} steps={{ ...none, profiles: "t1" }} currentStep="vault" />);
        expect(screen.getByText("2 of 3")).toBeInTheDocument();
        const segments = container.querySelectorAll("[data-segment]");
        expect([...segments].map(s => s.getAttribute("data-segment"))).toEqual(["done", "active", "waiting"]);
        expect(segments[1].querySelector(".motion-safe\\:animate-research-sweep")).not.toBeNull();
        expect(container.querySelectorAll(".motion-safe\\:animate-research-sweep")).toHaveLength(1);
    });

    it("counts the interview as the About, step 3", () => {
        render(<ResearchStatusBar {...base} steps={{ ...none, profiles: "t1", vault: "t2" }} currentStep="interview" />);
        expect(screen.getByText("3 of 3")).toBeInTheDocument();
    });

    it("shows no count before the build reports a step", () => {
        render(<ResearchStatusBar {...base} currentStep={null} />);
        expect(screen.queryByText(/of 3/)).not.toBeInTheDocument();
    });

    it("hints to tap along until the artist first taps the pill", () => {
        render(<ResearchStatusBar {...base} />);
        expect(screen.getByText("Tap to follow along")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: /finding your profiles…/ }));
        expect(screen.queryByText("Tap to follow along")).not.toBeInTheDocument();
    });

    it("does what the pill does when the artist taps the hint itself", () => {
        render(<ResearchStatusBar {...base} currentStep="vault" />);
        fireEvent.click(screen.getByText("Tap to follow along"));
        expect(showResearchSection).toHaveBeenCalledWith("vault");
        expect(screen.queryByText("Tap to follow along")).not.toBeInTheDocument();
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

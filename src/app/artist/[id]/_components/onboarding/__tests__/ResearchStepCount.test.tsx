import { render, screen } from "@testing-library/react";
import ResearchStepCount from "../ResearchStepCount";

const segment = (state: "done" | "active" | "waiting", label: "Links" | "Lore" | "About") => ({ label, state });

describe("ResearchStepCount", () => {
    it("says which of the three steps is running", () => {
        render(<ResearchStepCount segments={[segment("done", "Links"), segment("active", "Lore"), segment("waiting", "About")]} />);
        expect(screen.getByText("2 of 3")).toBeInTheDocument();
    });

    it("shows nothing when no step is running", () => {
        const { container } = render(<ResearchStepCount segments={[segment("waiting", "Links"), segment("waiting", "Lore"), segment("waiting", "About")]} />);
        expect(container).toBeEmptyDOMElement();
    });
});

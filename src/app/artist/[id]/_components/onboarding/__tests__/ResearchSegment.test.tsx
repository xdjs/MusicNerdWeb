import { render } from "@testing-library/react";
import ResearchSegment from "../ResearchSegment";

const SWEEP = ".motion-safe\\:animate-research-sweep";

describe("ResearchSegment", () => {
    it("sweeps while its step is running, and holds still under reduced motion", () => {
        const { container } = render(<ResearchSegment state="active" />);
        expect(container.querySelector("[data-segment=active]")).not.toBeNull();
        expect(container.querySelector(SWEEP)).toHaveClass("motion-reduce:w-full");
    });

    it("is a plain bar when done or waiting", () => {
        for (const state of ["done", "waiting"] as const) {
            const { container, unmount } = render(<ResearchSegment state={state} />);
            expect(container.querySelector(`[data-segment=${state}]`)).not.toBeNull();
            expect(container.querySelector(SWEEP)).toBeNull();
            unmount();
        }
    });
});

import { render, screen } from "@testing-library/react";
import ResearchNewMark from "../ResearchNewMark";
import ResearchNewCount from "../ResearchNewCount";
import { OnboardingProgressContext, type ResearchContextValue } from "../OnboardingProgressContext";

const none = { profiles: null, vault: null, interview: null, publish: null };

/** A research context for tests: nothing confirmed, nothing fresh, an empty baseline. */
function researchContext(over: Partial<ResearchContextValue> = {}): ResearchContextValue {
    return { steps: none, fresh: { profiles: false, vault: false, publish: false }, markSeen: jest.fn(), baseline: { links: [], sources: [] }, ...over };
}

const linksFresh = researchContext({ fresh: { profiles: true, vault: false, publish: false }, baseline: { links: ["deezer"], sources: ["s0"] } });

describe("ResearchNewMark", () => {
    it("marks a link that arrived with this build", () => {
        render(<OnboardingProgressContext.Provider value={linksFresh}><ResearchNewMark kind="links" itemKey="spotify"><span>Spotify</span></ResearchNewMark></OnboardingProgressContext.Provider>);
        expect(screen.getByText("Spotify").closest("[data-research-new-item]")).not.toBeNull();
        expect(screen.getByLabelText("new")).toBeInTheDocument();
    });

    it("leaves a link that was already there unmarked", () => {
        render(<OnboardingProgressContext.Provider value={linksFresh}><ResearchNewMark kind="links" itemKey="deezer"><span>Deezer</span></ResearchNewMark></OnboardingProgressContext.Provider>);
        expect(screen.getByText("Deezer").closest("[data-research-new-item]")).toBeNull();
    });

    it("leaves sources unmarked while only Links is fresh, and everything unmarked outside a build", () => {
        render(<OnboardingProgressContext.Provider value={linksFresh}><ResearchNewMark kind="sources" itemKey="s9"><span>Source</span></ResearchNewMark></OnboardingProgressContext.Provider>);
        expect(screen.getByText("Source").closest("[data-research-new-item]")).toBeNull();
        render(<ResearchNewMark kind="links" itemKey="spotify"><span>Plain</span></ResearchNewMark>);
        expect(screen.getByText("Plain").closest("[data-research-new-item]")).toBeNull();
    });
});

describe("ResearchNewCount", () => {
    it("counts what's new in a fresh section", () => {
        render(<OnboardingProgressContext.Provider value={linksFresh}><ResearchNewCount kind="links" keys={["spotify", "deezer", "instagram"]} /></OnboardingProgressContext.Provider>);
        expect(screen.getByText("2 new")).toBeInTheDocument();
    });

    it("shows nothing when nothing is new or the section isn't fresh", () => {
        const { container } = render(<OnboardingProgressContext.Provider value={linksFresh}><ResearchNewCount kind="links" keys={["deezer"]} /><ResearchNewCount kind="sources" keys={["s9"]} /></OnboardingProgressContext.Provider>);
        expect(container).toBeEmptyDOMElement();
    });
});

import { render, screen } from "@testing-library/react";
import ResearchPending from "../ResearchPending";
import { OnboardingProgressContext, type ResearchContextValue } from "../OnboardingProgressContext";

const none = { profiles: null, vault: null, interview: null, publish: null };

/** A research context for tests: nothing confirmed, nothing fresh, an empty baseline. */
function researchContext(over: Partial<ResearchContextValue> = {}): ResearchContextValue {
    return { steps: none, fresh: { profiles: false, vault: false, publish: false }, markSeen: jest.fn(), baseline: { links: [], sources: [] }, ...over };
}

const inBuild = (value: ResearchContextValue, ui: React.ReactNode) =>
    render(<OnboardingProgressContext.Provider value={value}>{ui}</OnboardingProgressContext.Provider>);

describe("ResearchPending", () => {
    it("shows link-tile skeletons and the caption above the section while its step isn't confirmed", () => {
        inBuild(researchContext(), <ResearchPending step="profiles" skeleton="links" label="finding your profiles…" arrivedLabel="Your links are ready"><p>links</p></ResearchPending>);
        const status = screen.getByRole("status", { name: "finding your profiles…" });
        expect(status.querySelectorAll("[data-skeleton]").length).toBeGreaterThan(0);
        expect(status).toHaveTextContent("finding your profiles…");
        expect(screen.getByText("links")).toBeInTheDocument();
    });

    it("shows source-card skeletons for Lore", () => {
        inBuild(researchContext(), <ResearchPending step="vault" skeleton="sources" label="reading…" arrivedLabel="Your lore is ready"><p>lore</p></ResearchPending>);
        expect(screen.getByRole("status", { name: "reading…" }).querySelectorAll("[data-skeleton=card]").length).toBeGreaterThan(0);
    });

    it("shows text-line skeletons instead of the About", () => {
        inBuild(researchContext(), <ResearchPending step="publish" skeleton="about" label="writing your about…" arrivedLabel="Your About is ready"><p>about</p></ResearchPending>);
        expect(screen.getByRole("status", { name: "writing your about…" }).querySelectorAll("[data-skeleton=line]")).toHaveLength(3);
        expect(screen.queryByText("about")).not.toBeInTheDocument();
    });

    it("shows just the section once its step is confirmed and it isn't fresh", () => {
        inBuild(researchContext({ steps: { profiles: "t1", vault: null, interview: null, publish: null } }), <ResearchPending step="profiles" skeleton="links" label="finding…" arrivedLabel="ready"><p>links</p></ResearchPending>);
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        expect(document.querySelector("[data-research-new]")).toBeNull();
    });

    it("marks a fresh section, announces it once, and reports it seen once it is on screen", () => {
        const markSeen = jest.fn();
        let onIntersect: (entries: { isIntersecting: boolean }[]) => void = () => {};
        const original = window.IntersectionObserver;
        window.IntersectionObserver = jest.fn((callback) => {
            onIntersect = callback;
            return { observe: jest.fn(), disconnect: jest.fn(), unobserve: jest.fn() };
        }) as unknown as typeof IntersectionObserver;
        inBuild(researchContext({ steps: { profiles: "t1", vault: null, interview: null, publish: null }, fresh: { profiles: true, vault: false, publish: false }, markSeen }),
            <ResearchPending step="profiles" skeleton="links" label="finding…" arrivedLabel="Your links are ready"><p>links</p></ResearchPending>);
        expect(document.querySelector("[data-research-new]")).toContainElement(screen.getByText("links"));
        expect(screen.getByRole("status")).toHaveTextContent("Your links are ready");
        expect(markSeen).not.toHaveBeenCalled();
        onIntersect([{ isIntersecting: true }]);
        expect(markSeen).toHaveBeenCalledWith("profiles");
        window.IntersectionObserver = original;
    });

    it("labels a fresh About as new", () => {
        inBuild(researchContext({ steps: { profiles: "a", vault: "b", interview: "c", publish: "c" }, fresh: { profiles: false, vault: false, publish: true } }),
            <ResearchPending step="publish" skeleton="about" label="writing…" arrivedLabel="Your About is ready"><p>about</p></ResearchPending>);
        expect(screen.getByText("New About")).toBeInTheDocument();
        expect(screen.getByText("about")).toBeInTheDocument();
    });

    it("shows just the section when no build is being watched", () => {
        render(<ResearchPending step="publish" skeleton="about" label="writing…" arrivedLabel="ready"><p>about</p></ResearchPending>);
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        expect(screen.getByText("about")).toBeInTheDocument();
    });
});

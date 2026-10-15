import { EditModeContext } from "@/app/_components/EditModeContext";
import ResearchEditBoundary from "../ResearchEditBoundary";
import { render, screen, fireEvent } from "@testing-library/react";
import ResearchPending from "../ResearchPending";
import { OnboardingProgressContext, type ResearchContextValue } from "../OnboardingProgressContext";

const none = { profiles: null, vault: null, interview: null, publish: null };

/** A research context for tests: nothing confirmed, nothing fresh, an empty baseline. */
function researchContext(over: Partial<ResearchContextValue> = {}): ResearchContextValue {
    return { steps: none, currentStep: null, fresh: { profiles: false, vault: false, publish: false }, markSeen: jest.fn(), complete: false, baseline: { links: [], sources: [] }, ...over };
}

const inBuild = (value: ResearchContextValue, ui: React.ReactNode) =>
    render(<OnboardingProgressContext.Provider value={value}>{ui}</OnboardingProgressContext.Provider>);

describe("ResearchPending", () => {
    it("pulses link-tile skeletons with no caption while Links is being researched, the pill being the one voice", () => {
        inBuild(researchContext({ currentStep: "profiles" }), <ResearchPending step="profiles" skeleton="links" label="finding your profiles…" arrivedLabel="Your links are ready"><p>links</p></ResearchPending>);
        const status = screen.getByRole("status", { name: "finding your profiles…" });
        expect(status.querySelectorAll("[data-skeleton]").length).toBeGreaterThan(0);
        expect(status.querySelector("[data-still]")).toBeNull();
        expect(screen.queryByText("finding your profiles…")).not.toBeInTheDocument();
        expect(screen.getByText("links")).toBeInTheDocument();
    });

    it("shows source-card skeletons instead of the existing Lore while it is being researched", () => {
        // 2026-10-14 stand-up: the build showed the placeholder AND the Lore
        // that already existed. Show the placeholder only.
        inBuild(researchContext({ currentStep: "vault" }), <ResearchPending step="vault" skeleton="sources" label="reading…" arrivedLabel="Your lore is ready"><p>lore</p></ResearchPending>);
        expect(screen.getByRole("status", { name: "reading…" }).querySelectorAll("[data-skeleton=card]").length).toBeGreaterThan(0);
        expect(screen.queryByText("lore")).not.toBeInTheDocument();
    });

    it("hides the existing Lore while it waits its turn, too", () => {
        inBuild(researchContext({ currentStep: "profiles" }), <ResearchPending step="vault" skeleton="sources" label="reading…" arrivedLabel="ready"><p>lore</p></ResearchPending>);
        expect(screen.queryByText("lore")).not.toBeInTheDocument();
    });

    it("shows the Lore again once its step is confirmed", () => {
        inBuild(researchContext({ steps: { profiles: "a", vault: "b", interview: null, publish: null } }), <ResearchPending step="vault" skeleton="sources" label="reading…" arrivedLabel="ready"><p>lore</p></ResearchPending>);
        expect(screen.getByText("lore")).toBeInTheDocument();
    });

    it("keeps a waiting section's skeleton still, silent and hidden from screen readers", () => {
        const { container } = inBuild(researchContext({ currentStep: "profiles" }), <ResearchPending step="vault" skeleton="sources" label="reading…" arrivedLabel="ready"><p>lore</p></ResearchPending>);
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        const waiting = container.querySelector("[data-still]");
        expect(waiting).not.toBeNull();
        expect(waiting?.closest("[aria-hidden=true]")).not.toBeNull();
        expect(screen.queryByText("reading…")).not.toBeInTheDocument();
    });

    it("never says it is writing the About while Links is being researched", () => {
        inBuild(researchContext({ currentStep: "profiles" }), <ResearchPending step="publish" skeleton="about" label="writing your about…" arrivedLabel="Your About is ready"><p>about</p></ResearchPending>);
        expect(screen.queryByText("writing your about…")).not.toBeInTheDocument();
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        expect(document.querySelectorAll("[data-skeleton=line]")).toHaveLength(3);
        expect(screen.queryByText("about")).not.toBeInTheDocument();
    });

    it("shows pulsing text-line skeletons instead of the About while it is being written, interview included", () => {
        inBuild(researchContext({ currentStep: "interview" }), <ResearchPending step="publish" skeleton="about" label="writing your about…" arrivedLabel="Your About is ready"><p>about</p></ResearchPending>);
        const status = screen.getByRole("status", { name: "writing your about…" });
        expect(status.querySelectorAll("[data-skeleton=line]")).toHaveLength(3);
        expect(status.querySelector("[data-still]")).toBeNull();
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

it('keeps an existing draft mounted and hidden when the About placeholder starts', () => {
    const view = (value: ResearchContextValue | null) => <EditModeContext.Provider value={{isEditing:true,canEdit:true,toggle:jest.fn()}}><OnboardingProgressContext.Provider value={value}><ResearchEditBoundary><ResearchPending step="publish" skeleton="about" label="writing" arrivedLabel="ready"><input aria-label="Draft" /></ResearchPending></ResearchEditBoundary></OnboardingProgressContext.Provider></EditModeContext.Provider>;
    const {rerender} = render(view(null));
    const input=screen.getByLabelText('Draft');
    fireEvent.change(input,{target:{value:'Do not discard'}});
    rerender(view(researchContext()));
    expect(input).toBeInTheDocument();
    expect(input).not.toBeVisible();
    rerender(view(null));
    expect(screen.getByLabelText('Draft')).toBe(input);
    expect(input).toHaveValue('Do not discard');
});

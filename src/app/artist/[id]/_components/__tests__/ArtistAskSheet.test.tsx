import { render, screen } from "@testing-library/react";
import ArtistAskSheet from "../ArtistAskSheet";
import { OnboardingProgressContext, type ResearchContextValue } from "../onboarding/OnboardingProgressContext";

jest.mock("../AskAboutArtist", () => ({ __esModule: true, default: () => null }));

const research = (complete: boolean): ResearchContextValue => ({
    steps: { profiles: null, vault: null, interview: null, publish: null },
    fresh: { profiles: false, vault: false, publish: false },
    markSeen: jest.fn(),
    complete,
    baseline: { links: [], sources: [] },
});

describe("ArtistAskSheet", () => {
    it("shows Ask on a page with no build being watched", () => {
        render(<ArtistAskSheet artistId="a1" artistName="Nova" />);
        expect(screen.getByRole("button", { name: "Ask about Nova" })).toBeInTheDocument();
    });

    it("gives its place to the research progress pill while research runs", () => {
        render(<OnboardingProgressContext.Provider value={research(false)}><ArtistAskSheet artistId="a1" artistName="Nova" /></OnboardingProgressContext.Provider>);
        expect(screen.queryByRole("button", { name: "Ask about Nova" })).not.toBeInTheDocument();
    });

    it("comes back once research is complete", () => {
        render(<OnboardingProgressContext.Provider value={research(true)}><ArtistAskSheet artistId="a1" artistName="Nova" researching /></OnboardingProgressContext.Provider>);
        expect(screen.getByRole("button", { name: "Ask about Nova" })).toBeInTheDocument();
    });

    it("stays hidden from the first render when the page arrived mid-build, before the pill mounts", () => {
        render(<ArtistAskSheet artistId="a1" artistName="Nova" researching />);
        expect(screen.queryByRole("button", { name: "Ask about Nova" })).not.toBeInTheDocument();
    });
});

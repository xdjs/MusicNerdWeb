// @ts-nocheck
import React from "react";
import { render, screen } from "@testing-library/react";

// The sections are mocked down to the props this component decides, so the
// test covers what it owns: the hero's bio, the link editors' mode, and that the
// page runs hero through Ask sheet (the research view swaps all of it out).
jest.mock("../HeroSection", () => ({ __esModule: true, default: ({ bio, children }) => <section data-testid="hero" data-bio={bio ?? ""}>{children}</section> }));
jest.mock("../ClaimButton", () => ({ __esModule: true, default: () => <button>claim</button> }));
jest.mock("@/app/_components/EditModeToggle", () => ({ __esModule: true, default: () => <button>edit</button> }));
jest.mock("../ProfileSectionNav", () => ({ __esModule: true, default: () => <nav /> }));
jest.mock("../LatestSection", () => ({ __esModule: true, default: () => <section data-testid="latest" /> }));
jest.mock("../RevealSection", () => ({ __esModule: true, default: ({ children, id }) => <section id={id}>{children}</section> }));
jest.mock("../AddArtistData", () => ({ __esModule: true, default: ({ directEdit, autoApprove }) => <button data-testid="add" data-direct={String(directEdit)} data-auto={String(autoApprove)} /> }));
jest.mock("@/app/_components/ArtistLinksGrid", () => ({ __esModule: true, default: () => <div /> }));
jest.mock("../OfficialSiteLinks", () => ({ __esModule: true, default: () => <div /> }));
jest.mock("../VaultSection", () => ({ __esModule: true, default: ({ pendingSources }) => <section data-testid="vault" data-pending={pendingSources.length} /> }));
jest.mock("../KnowledgeSection", () => ({ __esModule: true, default: () => <section data-testid="knowledge" /> }));
jest.mock("../ArtistAskSheet", () => ({ __esModule: true, default: () => <aside data-testid="ask" /> }));

import ArtistProfileContent from "../ArtistProfileContent";
import { ResearchProgressContext } from "../onboarding/ResearchProgressContext";

const base = {
    artist: { id: "a1", name: "Bio Ritmo", bio: "A salsa band from Richmond.", spotify: null, deezer: "416544" },
    imageUrl: "/img.jpg",
    platformImage: "/img.jpg",
    artistLinks: [],
    approvedSources: [],
    pendingSources: [],
    urlMapList: [],
    isClaimed: true,
    isClaimedByUser: true,
    isPending: false,
    isPendingByUser: false,
    canEdit: true,
    autoApprove: false,
};

describe("ArtistProfileContent", () => {
    it("renders the page from hero to Ask sheet", () => {
        const { container } = render(<ArtistProfileContent {...base} />);
        const ids = [...container.querySelectorAll("[data-testid]")].map(el => el.getAttribute("data-testid"));
        expect(ids[0]).toBe("hero");
        expect(ids[ids.length - 1]).toBe("ask");
        expect(ids).toEqual(expect.arrayContaining(["latest", "vault", "knowledge"]));
    });

    it("gives the hero the artist's own About, and nothing for an empty one", () => {
        const { unmount } = render(<ArtistProfileContent {...base} />);
        expect(screen.getByTestId("hero")).toHaveAttribute("data-bio", "A salsa band from Richmond.");
        unmount();
        render(<ArtistProfileContent {...base} artist={{ ...base.artist, bio: "  " }} />);
        expect(screen.getByTestId("hero")).toHaveAttribute("data-bio", "");
    });

    it("lets the claim owner edit links directly; others submit with the given approval", () => {
        const { unmount } = render(<ArtistProfileContent {...base} />);
        screen.getAllByTestId("add").forEach(b => expect(b).toHaveAttribute("data-direct", "true"));
        unmount();
        render(<ArtistProfileContent {...base} isClaimedByUser={false} autoApprove />);
        screen.getAllByTestId("add").forEach(b => {
            expect(b).toHaveAttribute("data-direct", "false");
            expect(b).toHaveAttribute("data-auto", "true");
        });
    });

    it("shows a loading line in Links until the profiles stage is done", () => {
        const stages = [{ group: "platform-search", label: "Finding your profiles", state: "active" as const }];
        const { container } = render(<ResearchProgressContext.Provider value={stages}><ArtistProfileContent {...base} /></ResearchProgressContext.Provider>);
        expect(container.querySelector("#mn-links [role=status]")).toHaveTextContent("finding your profiles…");
    });

    // Research repaints this page in place (#1365). Two siblings sharing a key
    // made React leave a second section nav behind when the hero's photo
    // changed mid-build.
    it("gives every section a key of its own, so an in-place repaint never duplicates one", () => {
        const errors = jest.spyOn(console, "error").mockImplementation(() => {});
        const { rerender } = render(<ArtistProfileContent {...base} />);
        rerender(<ArtistProfileContent {...base} imageUrl="/spotify.jpg" />);
        const keyErrors = errors.mock.calls.filter(c => String(c[0]).includes("same key"));
        errors.mockRestore();
        expect(keyErrors).toEqual([]);
    });
});


// @ts-nocheck
import React from "react";
import { render, screen, within } from "@testing-library/react";

// The sections are mocked down to the props this component decides, so the
// test covers what it owns: the hero's bio, the link editors' mode, and that the
// page runs hero through Ask sheet.
jest.mock("../HeroSection", () => ({ __esModule: true, default: ({ bio, statusBadge, children }) => <section data-testid="hero" data-bio={bio ?? ""}><div data-testid="image-status">{statusBadge}</div>{children}</section> }));
jest.mock("../ClaimButton", () => ({ __esModule: true, default: () => <button>claim</button> }));
jest.mock("@/app/_components/EditModeToggle", () => ({ __esModule: true, default: () => <button>edit</button> }));
jest.mock("../ProfileSectionNav", () => ({ __esModule: true, default: () => <nav /> }));
jest.mock("../LatestSection", () => ({ __esModule: true, default: () => <section data-testid="latest" /> }));
jest.mock("../RevealSection", () => ({ __esModule: true, default: ({ children, id }) => <section id={id}>{children}</section> }));
jest.mock("../AddArtistData", () => ({ __esModule: true, default: ({ directEdit, autoApprove }) => <button data-testid="add" data-direct={String(directEdit)} data-auto={String(autoApprove)} /> }));
jest.mock("@/app/_components/ArtistLinksGrid", () => ({ __esModule: true, default: () => <div /> }));
jest.mock("../OfficialSiteLinks", () => ({ __esModule: true, default: () => <div /> }));
jest.mock("../VaultSection", () => ({ __esModule: true, default: ({ pendingSources, autoApprove }) => <section data-testid="vault" data-pending={pendingSources.length} data-auto={String(autoApprove)} /> }));
jest.mock("../KnowledgeSection", () => ({ __esModule: true, default: () => <section data-testid="knowledge" /> }));
jest.mock("../ArtistAskSheet", () => ({ __esModule: true, default: () => <aside data-testid="ask" /> }));

import ArtistProfileContent from "../ArtistProfileContent";
import { OnboardingProgressContext } from "../onboarding/OnboardingProgressContext";

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
    it.each([true, false])('passes server-derived trusted status to Lore (%s)', autoApprove => {
        render(<ArtistProfileContent {...base} canEdit={false} isClaimedByUser={false} autoApprove={autoApprove} />);
        expect(screen.getByTestId('vault')).toHaveAttribute('data-auto', String(autoApprove));
    });
    it("keeps the profile readable without asserting claim status after a failed lookup", () => {
        render(<ArtistProfileContent {...base} claimStatusKnown={false} isClaimed={false} isClaimedByUser={false} canEdit={false} />);
        expect(screen.getByTestId("image-status")).toBeEmptyDOMElement();
        expect(screen.queryByRole("button", { name: "claim" })).not.toBeInTheDocument();
        expect(screen.getByTestId("latest")).toBeInTheDocument();
    });

    it.each([true, false])("places approved status on the image regardless of ownership (%s)", isClaimedByUser => {
        render(<ArtistProfileContent {...base} isClaimedByUser={isClaimedByUser} canEdit={isClaimedByUser} />);
        expect(within(screen.getByTestId("image-status")).getByRole("button", { name: "Claimed artist profile" })).toBeInTheDocument();
        expect(within(screen.getByRole("group", { name: "Manage artist profile" })).queryByRole("button", { name: "Claimed artist profile" })).not.toBeInTheDocument();
    });

    it("keeps pending details out of the public image badge", () => {
        render(<ArtistProfileContent {...base} isClaimed={false} isClaimedByUser={false} isPending canEdit={false} />);
        expect(within(screen.getByTestId("image-status")).getByRole("button", { name: "Unclaimed artist profile" })).toHaveTextContent("Unclaimed");
        expect(within(screen.getByTestId("image-status")).queryByText(/pending/i)).not.toBeInTheDocument();
    });
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

    it("shows a loading line in Links until the profiles step is confirmed", () => {
        const steps = { profiles: null, vault: null, interview: null, publish: null };
        const { container } = render(<OnboardingProgressContext.Provider value={steps}><ArtistProfileContent {...base} /></OnboardingProgressContext.Provider>);
        expect(container.querySelector("#mn-links [role=status]")).toHaveTextContent("finding your profiles…");
    });
});

 it("keeps one navigation below the hero after repeated photo and crop refreshes", () => {
    const { container, rerender } = render(<ArtistProfileContent {...base} />);
    for (const [imageUrl, y] of [["/new.jpg", 0], ["/new.jpg", 35], ["/upload.jpg", 0]]) {
        rerender(<ArtistProfileContent {...base} imageUrl={imageUrl} artist={{ ...base.artist, customImage: imageUrl, headerImagePosition: { imageUrl, y } }} />);
        expect(container.querySelectorAll('nav')).toHaveLength(1);
        expect(container.firstElementChild).toHaveAttribute('data-testid', 'hero');
        expect(container.querySelector('nav')?.previousElementSibling).toHaveAttribute('data-testid', 'hero');
        expect(screen.getAllByTestId('ask')).toHaveLength(1);
    }
 });

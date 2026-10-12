import React from "react";
import { render, screen } from "@testing-library/react";
import PressAndFeatures from "../PressAndFeatures";

const apple = "https://podcasts.apple.com/us/podcast/episode/id123?i=456";
const iheart = "https://www.iheart.com/podcast/show/episode/episode-789/";

it("renders one podcast card with separate source links and a visible story count", () => {
    render(<PressAndFeatures sources={[
        { id: "apple", artistId: "artist-1", url: apple, title: "Episode - Apple", type: "audio", podcastEpisodeKey: "buzzsprout:1:2", podcastEpisodeTitle: "Episode", podcastShowTitle: "The Show" },
        { id: "iheart", artistId: "artist-1", url: iheart, title: "Episode - iHeart", type: "audio", podcastEpisodeKey: "buzzsprout:1:2" },
        { id: "apple-locale", artistId: "artist-1", url: apple + "&l=fr-FR", title: "Episode - Apple French", type: "audio", podcastEpisodeKey: "buzzsprout:1:2" },
        { id: "article", artistId: "artist-1", url: "https://example.org/article", title: "Other story", type: "article" },
    ]} />);

    expect(screen.getAllByText("Episode")).toHaveLength(1);
    expect(screen.getByText("The Show")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Apple Podcasts" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Apple Podcasts" })).toHaveAttribute("href", apple);
    expect(screen.getByRole("link", { name: "iHeart" })).toHaveAttribute("href", iheart);
    expect(screen.getByRole("button", { name: "All (2)" })).toBeInTheDocument();
});

it("marks sources that arrived with the build being watched, and only those", () => {
    const { OnboardingProgressContext } = jest.requireActual("../onboarding/OnboardingProgressContext");
    const value = { steps: { profiles: "t1", vault: "t2", interview: null, publish: null }, fresh: { profiles: false, vault: true, publish: false }, markSeen: jest.fn(), complete: false, baseline: { links: [], sources: ["old"] } };
    render(<OnboardingProgressContext.Provider value={value}><PressAndFeatures sources={[
        { id: "old", artistId: "artist-1", url: "https://example.org/old", title: "Old story", type: "article" },
        { id: "new", artistId: "artist-1", url: "https://example.org/new", title: "New story", type: "article" },
    ]} /></OnboardingProgressContext.Provider>);
    expect(screen.getByText("New story").closest("[data-research-new-item]")).not.toBeNull();
    expect(screen.getByText("Old story").closest("[data-research-new-item]")).toBeNull();
});

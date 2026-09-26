import React from "react";
import { render, screen } from "@testing-library/react";
import PressAndFeatures from "../PressAndFeatures";

const apple = "https://podcasts.apple.com/us/podcast/episode/id123?i=456";
const iheart = "https://www.iheart.com/podcast/show/episode/episode-789/";

it("renders one podcast card with separate source links and a visible story count", () => {
    render(<PressAndFeatures sources={[
        { id: "apple", artistId: "artist-1", url: apple, title: "Episode - Apple", type: "audio", podcastEpisodeKey: "buzzsprout:1:2", podcastEpisodeTitle: "Episode", podcastShowTitle: "The Show" },
        { id: "iheart", artistId: "artist-1", url: iheart, title: "Episode - iHeart", type: "audio", podcastEpisodeKey: "buzzsprout:1:2" },
        { id: "article", artistId: "artist-1", url: "https://example.org/article", title: "Other story", type: "article" },
    ]} />);

    expect(screen.getAllByText("Episode")).toHaveLength(1);
    expect(screen.getByText("The Show")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Apple Podcasts" })).toHaveAttribute("href", apple);
    expect(screen.getByRole("link", { name: "iHeart" })).toHaveAttribute("href", iheart);
    expect(screen.getByRole("button", { name: "All (2)" })).toBeInTheDocument();
});

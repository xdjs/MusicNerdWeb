import { render, screen, waitFor, cleanup } from "@testing-library/react";
import HomePageSplash from "@/app/_components/HomePageSplash";

describe("Homepage design system composition", () => {
    afterEach(cleanup);

    it("keeps the manifesto and live artist navigation together on the homepage", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => [{
                type: "artist_added",
                artistId: "artist-sento",
                artistName: "SENTO",
                platform: null,
                createdAt: new Date().toISOString(),
            }],
        });

        render(<HomePageSplash />);

        expect(screen.getByRole("heading", { level: 1, name: "music nerd" })).toBeInTheDocument();
        expect(screen.getByRole("region", { name: "Our manifesto" })).toHaveTextContent(
            "we care when artists let us into the work",
        );
        expect(screen.getByRole("region", { name: "around the directory" })).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByRole("link", { name: /SENTO/ })).toHaveAttribute("href", "/artist/artist-sento");
        });
        expect(global.fetch).toHaveBeenCalledWith("/api/activity");
        expect(screen.getByRole("list", { name: "Recent activity" })).toHaveAttribute("aria-live", "polite");
    });
});

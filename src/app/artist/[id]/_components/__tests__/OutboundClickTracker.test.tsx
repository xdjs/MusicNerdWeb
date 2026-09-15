import React from "react";
import { render, fireEvent, cleanup } from "@testing-library/react";

const mockTrackEvent = jest.fn();
jest.mock("@/lib/analytics/trackEvent", () => ({ trackEvent: (...args: unknown[]) => mockTrackEvent(...args) }));

import OutboundClickTracker from "../OutboundClickTracker";

function renderPage() {
    return render(
        <div>
            <OutboundClickTracker />
            <section id="mn-links">
                <a href="https://open.spotify.com/artist/abc" target="_blank" rel="noopener noreferrer">
                    <span data-testid="spotify-label">Spotify</span>
                </a>
                <a href="/api/activity" data-testid="internal">Same-origin link</a>
            </section>
            <a href="https://dutchmassive.bandcamp.com" data-testid="loose">Bandcamp</a>
            <div role="dialog" data-analytics-surface="latest">
                <a href="https://www.inprocess.world/collect/base:0x1/2" data-testid="dialog-cta">Open on In Process</a>
            </div>
        </div>,
    );
}

describe("OutboundClickTracker", () => {
    beforeEach(() => mockTrackEvent.mockReset());
    afterEach(cleanup);

    it("reports an off-site link with its platform and enclosing section, even when a child is clicked", () => {
        const { getByTestId } = renderPage();
        fireEvent.click(getByTestId("spotify-label"));
        expect(mockTrackEvent).toHaveBeenCalledWith("outbound_click", { platform: "spotify", surface: "links" });
    });

    it("reports 'page' for a link outside any profile section", () => {
        const { getByTestId } = renderPage();
        fireEvent.click(getByTestId("loose"));
        expect(mockTrackEvent).toHaveBeenCalledWith("outbound_click", { platform: "bandcamp", surface: "page" });
    });

    it("reports a portalled dialog's surface from its data attribute", () => {
        const { getByTestId } = renderPage();
        fireEvent.click(getByTestId("dialog-cta"));
        expect(mockTrackEvent).toHaveBeenCalledWith("outbound_click", { platform: "inprocess", surface: "latest" });
    });

    it("ignores links to the site itself", () => {
        const { getByTestId } = renderPage();
        fireEvent.click(getByTestId("internal"));
        expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it("stops listening when unmounted", () => {
        const { getByTestId, unmount } = renderPage();
        const label = getByTestId("spotify-label");
        unmount();
        fireEvent.click(label);
        expect(mockTrackEvent).not.toHaveBeenCalled();
    });
});

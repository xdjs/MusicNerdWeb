// @ts-nocheck
import { jest } from "@jest/globals";
import React from "react";
import { render, screen, waitFor, act, cleanup } from "@testing-library/react";

// Mock next/link as a simple anchor
jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ href, children, ...props }) =>
        <a href={href} {...props}>{children}</a>,
}));

const mockEvents = [
    { type: "agent_mapping", artistId: "a1", artistName: "Mogwai", platform: "deezer", createdAt: "2026-03-27T12:00:00Z" },
    { type: "ugc_approved", artistId: "a2", artistName: "SENTO", platform: "youtube", createdAt: "2026-03-27T11:55:00Z" },
    { type: "artist_added", artistId: "a3", artistName: "Taylor Swift", platform: null, createdAt: "2026-03-27T11:00:00Z" },
];

// Static import of ActivityFeed — no resetModules needed since the component
// has no module-level side effects that require re-initialization.
import ActivityFeed from "../ActivityFeed";

describe("ActivityFeed", () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockReset();
    });

    afterEach(cleanup);

    it("shows empty state before data loads", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => [],
        });

        await act(async () => { render(<ActivityFeed />); });

        expect(screen.getByText("Waiting for activity...")).toBeTruthy();
    });

    it("renders events after initial fetch", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockEvents,
        });

        await act(async () => { render(<ActivityFeed />); });

        await waitFor(() => {
            expect(screen.getByText("Mogwai")).toBeTruthy();
            expect(screen.getByText("SENTO")).toBeTruthy();
            expect(screen.getByText("Taylor Swift")).toBeTruthy();
        });
    });

    it("renders artist names as links to artist pages", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockEvents,
        });

        await act(async () => { render(<ActivityFeed />); });

        await waitFor(() => {
            const links = screen.getAllByRole("link");
            expect(links.some((l) => l.getAttribute("href") === "/artist/a1")).toBe(true);
            expect(links.some((l) => l.getAttribute("href") === "/artist/a3")).toBe(true);
        });
    });

    it("shows live indicator", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => [],
        });

        await act(async () => { render(<ActivityFeed />); });

        expect(screen.getByText("Live")).toBeTruthy();
    });

    it("has aria-live region for accessibility", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockEvents,
        });

        await act(async () => { render(<ActivityFeed />); });

        await waitFor(() => {
            const list = screen.getByRole("list");
            expect(list.getAttribute("aria-live")).toBe("polite");
            expect(list.getAttribute("aria-label")).toBe("Recent activity");
        });
    });

    it("handles fetch failure gracefully", async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

        await act(async () => { render(<ActivityFeed />); });

        expect(screen.getByText("Waiting for activity...")).toBeTruthy();
    });
});

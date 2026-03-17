// @ts-nocheck
import { jest } from "@jest/globals";
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next/link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children),
}));

const mockData = {
  stats: {
    totalArtistsWithSpotify: 38401,
    platformStats: [
      { platform: "deezer", mappedCount: 1127, percentage: 2.93 },
      { platform: "apple_music", mappedCount: 257, percentage: 0.67 },
    ],
  },
  auditLog: {
    entries: [
      {
        id: "audit-1",
        artistId: "artist-uuid-1",
        artistName: "Beyoncé",
        field: "mapping:deezer",
        action: "resolve",
        oldValue: null,
        newValue: "145",
        agentLabel: "id-mapping-agent-wb0",
        createdAt: "2026-03-16T20:00:00Z",
      },
      {
        id: "audit-2",
        artistId: "artist-uuid-2",
        artistName: "Aurora",
        field: "mapping:deezer",
        action: "exclude",
        oldValue: null,
        newValue: "too_ambiguous: multiple candidates",
        agentLabel: "id-mapping-agent-wb0",
        createdAt: "2026-03-16T19:55:00Z",
      },
    ],
    total: 120,
    page: 1,
    limit: 50,
  },
  agentBreakdown: {
    agents: [
      {
        label: "id-mapping-agent-wb0",
        apiKeyHash: "85eabcee",
        resolvedCount: 847,
        excludedCount: 73,
        byConfidence: { high: 700, medium: 130, low: 17, manual: 0 },
        bySource: { wikidata: 200, musicbrainz: 150, name_search: 400, web_search: 97, manual: 0 },
      },
    ],
  },
  exclusions: {
    platforms: {
      deezer: {
        exclusions: [
          {
            id: "exc-1",
            artistId: "artist-uuid-3",
            artistName: "Aurora",
            spotify: "sp123",
            reason: "too_ambiguous",
            details: "5 candidates, none conclusive",
            createdAt: "2026-03-16T19:00:00Z",
          },
        ],
        total: 1,
      },
    },
  },
};

// Import component statically to avoid React duplication from resetModules
import AgentWorkSection from "../AgentWorkSection";

describe("AgentWorkSection", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function renderComponent() {
    return render(<AgentWorkSection />);
  }

  it("shows loading state initially", async () => {
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {})); // never resolves
    await renderComponent();
    // Spinner is visible (the animate-spin div)
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("renders platform stats after fetch", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByText("deezer")).toBeInTheDocument();
    });
    expect(screen.getByText("1,127")).toBeInTheDocument();
    expect(screen.getByText("2.93%")).toBeInTheDocument();
    expect(screen.getByText("apple_music")).toBeInTheDocument();
  });

  it("renders per-agent breakdown table", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByText("Per-Agent Breakdown")).toBeInTheDocument();
    });
    // Agent label appears in breakdown table + audit log entries
    expect(screen.getAllByText("id-mapping-agent-wb0").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("847")).toBeInTheDocument(); // resolvedCount
    expect(screen.getByText("73")).toBeInTheDocument(); // excludedCount
  });

  it("renders audit log with entries", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByText("Beyoncé")).toBeInTheDocument();
    });
    expect(screen.getByText("Aurora")).toBeInTheDocument();
    expect(screen.getByText("resolve")).toBeInTheDocument();
    expect(screen.getByText("exclude")).toBeInTheDocument();
  });

  it("audit log pagination calls fetch with next page", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByText("Next")).toBeInTheDocument();
    });

    // Click Next
    fireEvent.click(screen.getByText("Next"));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("auditPage=2")
      );
    });
  });

  it("Previous button is disabled on page 1", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByText("Previous")).toBeInTheDocument();
    });
    expect(screen.getByText("Previous")).toBeDisabled();
  });

  it("renders exclusions grouped by platform", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByText("deezer (1)")).toBeInTheDocument();
    });
  });

  it("artist names are links to artist pages", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByText("Beyoncé")).toBeInTheDocument();
    });
    const beyonceLink = screen.getByText("Beyoncé").closest("a");
    expect(beyonceLink).toHaveAttribute("href", "/artist/artist-uuid-1");
  });

  it("shows error state on fetch failure", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    });
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("action badges have correct styling", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByText("resolve")).toBeInTheDocument();
    });
    const resolveBadge = screen.getByText("resolve");
    expect(resolveBadge.className).toContain("bg-green-500");
    const excludeBadge = screen.getByText("exclude");
    expect(excludeBadge.className).toContain("bg-yellow-500");
  });
});

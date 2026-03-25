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

const mockSummary = {
  stats: {
    totalArtistsWithSpotify: 38401,
    platformStats: [
      { platform: "deezer", mappedCount: 1127, percentage: 2.93, todayCount: 42 },
      { platform: "apple_music", mappedCount: 257, percentage: 0.67, todayCount: 5 },
    ],
  },
  activityPulse: {
    lastWriteAt: "2026-03-16T20:00:00Z",
    rateLastHour: 42,
  },
  hourlyActivity: [
    { hour: "2026-03-16T19:00:00Z", resolveCount: 30, excludeCount: 5 },
    { hour: "2026-03-16T20:00:00Z", resolveCount: 25, excludeCount: 3 },
  ],
  workers: [],
};

const mockDetails = {
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
        lastActiveAt: "2026-03-16T20:00:00Z",
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

function mockFetchResponses(summary = mockSummary, details = mockDetails) {
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (url.includes("sections=details")) {
      return Promise.resolve({ ok: true, json: async () => details });
    }
    return Promise.resolve({ ok: true, json: async () => summary });
  });
}

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
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("renders platform stats after fetch", async () => {
    mockFetchResponses();
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByText("deezer")).toBeInTheDocument();
    });
    expect(screen.getByText("1,127")).toBeInTheDocument();
    expect(screen.getByText("apple_music")).toBeInTheDocument();
  });

  it("shows Show Details button before details are loaded", async () => {
    mockFetchResponses();
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByText("Show Details")).toBeInTheDocument();
    });
    // Details sections should NOT be visible yet
    expect(screen.queryByText("Per-Agent Breakdown")).not.toBeInTheDocument();
    expect(screen.queryByText("Beyoncé")).not.toBeInTheDocument();
  });

  it("loads details on Show Details click", async () => {
    mockFetchResponses();
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByText("Show Details")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Show Details"));

    await waitFor(() => {
      expect(screen.getByText("Per-Agent Breakdown")).toBeInTheDocument();
    });
    expect(screen.getByText("Beyoncé")).toBeInTheDocument();
    expect(screen.getByText("847")).toBeInTheDocument(); // resolvedCount
    expect(screen.getByText("73")).toBeInTheDocument(); // excludedCount
    expect(screen.getByText("resolve")).toBeInTheDocument();
    expect(screen.getByText("exclude")).toBeInTheDocument();
    // Show Details button should be gone
    expect(screen.queryByText("Show Details")).not.toBeInTheDocument();
  });

  it("audit log pagination calls fetch with sections=details", async () => {
    mockFetchResponses();
    await renderComponent();
    await waitFor(() => { expect(screen.getByText("Show Details")).toBeInTheDocument(); });
    fireEvent.click(screen.getByText("Show Details"));
    await waitFor(() => { expect(screen.getByText("Next")).toBeInTheDocument(); });

    fireEvent.click(screen.getByText("Next"));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("sections=details&auditPage=2")
      );
    });
  });

  it("Previous button is disabled on page 1", async () => {
    mockFetchResponses();
    await renderComponent();
    await waitFor(() => { expect(screen.getByText("Show Details")).toBeInTheDocument(); });
    fireEvent.click(screen.getByText("Show Details"));
    await waitFor(() => { expect(screen.getByText("Previous")).toBeInTheDocument(); });
    expect(screen.getByText("Previous")).toBeDisabled();
  });

  it("renders exclusions grouped by platform after details load", async () => {
    mockFetchResponses();
    await renderComponent();
    await waitFor(() => { expect(screen.getByText("Show Details")).toBeInTheDocument(); });
    fireEvent.click(screen.getByText("Show Details"));
    await waitFor(() => {
      expect(screen.getByText("deezer (1)")).toBeInTheDocument();
    });
  });

  it("artist names are links to artist pages", async () => {
    mockFetchResponses();
    await renderComponent();
    await waitFor(() => { expect(screen.getByText("Show Details")).toBeInTheDocument(); });
    fireEvent.click(screen.getByText("Show Details"));
    await waitFor(() => { expect(screen.getByText("Beyoncé")).toBeInTheDocument(); });
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
    mockFetchResponses();
    await renderComponent();
    await waitFor(() => { expect(screen.getByText("Show Details")).toBeInTheDocument(); });
    fireEvent.click(screen.getByText("Show Details"));
    await waitFor(() => { expect(screen.getByText("resolve")).toBeInTheDocument(); });
    const resolveBadge = screen.getByText("resolve");
    expect(resolveBadge.className).toContain("bg-green-500");
    const excludeBadge = screen.getByText("exclude");
    expect(excludeBadge.className).toContain("bg-yellow-500");
  });
});

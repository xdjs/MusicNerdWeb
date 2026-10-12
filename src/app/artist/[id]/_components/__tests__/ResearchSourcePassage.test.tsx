import { fireEvent, render, screen } from "@testing-library/react";
import ResearchSourcePassage from "../ResearchSourcePassage";

const revision = "a".repeat(64);
const catalogId = `latest:deezer:${"b".repeat(64)}`;
const captionId = "social:11111111-1111-1111-1111-111111111111:caption";
const record = JSON.stringify({
  provider: "deezer",
  artist_account: "63751082",
  id: "799871131",
  title: "Trend to Zero",
  release_type: "ep",
  release_date: "2025-08-08",
});
function respond(sourceId: string, text: string) {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({
      status: "ok",
      passage: {
        sourceId,
        revision,
        start: 0,
        end: text.length,
        text,
        url: "https://www.deezer.com/album/799871131",
        curation: "approved",
        evidenceKind: "original_text",
        speaker: "not_applicable",
        publishedAt: null,
        retrievedAt: null,
        truncated: false,
      },
      totalChars: text.length,
      nextStart: null,
    }),
  });
}
beforeEach(() => {
  global.fetch = jest.fn();
});
it("renders release evidence without account IDs or JSON, reading the exact revision only on demand", async () => {
  respond(catalogId, record);
  const { container } = render(
    <ResearchSourcePassage
      artistId="artist"
      source={{ n: 1, sourceId: catalogId, revision, start: 0 }}
    />,
  );
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Source details [1]" }));
  expect(await screen.findByText("Trend to Zero")).toBeInTheDocument();
  expect(screen.getByText("EP")).toBeInTheDocument();
  expect(screen.getByText("August 8, 2025")).toBeInTheDocument();
  expect(container.textContent).not.toMatch(
    /artist_account|63751082|release_type/,
  );
  expect(
    screen.getByRole("link", { name: /Open original source/ }),
  ).toHaveAttribute("href", "https://www.deezer.com/album/799871131");
  expect(fetch).toHaveBeenCalledTimes(1);
  const url = new URL(
    (fetch as jest.Mock).mock.calls[0][0],
    "https://example.test",
  );
  expect(url.searchParams.get("sourceId")).toBe(catalogId);
  expect(url.searchParams.get("revision")).toBe(revision);
});
it("preserves an ordinary caption verbatim", async () => {
  const text = "We made this together.\nA second line.";
  respond(captionId, text);
  const { container } = render(
    <ResearchSourcePassage
      artistId="artist"
      source={{ n: 2, sourceId: captionId, revision }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Read passage [2]" }));
  await screen.findByText(/We made this together/);
  expect(container.querySelector("blockquote")?.textContent).toBe(text);
});
it("does not expose malformed provider JSON", async () => {
  respond(catalogId, '{"provider":"deezer","artist_account":');
  const { container } = render(
    <ResearchSourcePassage
      artistId="artist"
      source={{ n: 1, sourceId: catalogId, revision }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Source details [1]" }));
  expect(
    await screen.findByText("Source details aren’t available here."),
  ).toBeInTheDocument();
  expect(container.textContent).not.toContain("artist_account");
});
it("assembles a long structured record before displaying its fields", async () => {
  const sourceId = `latest:inprocess:${"c".repeat(64)}`;
  const full = JSON.stringify({ provider: "inprocess", title: "By Design", description: "x".repeat(14000), created_at: "2026-10-09T14:00:13Z" });
  (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
    const start = Number(new URL(url, "https://example.test").searchParams.get("start"));
    const end = Math.min(start + 12000, full.length);
    return { ok: true, json: async () => ({ status: "ok", passage: { sourceId, revision, start, end, text: full.slice(start, end), url: "https://www.inprocess.world/collect/example", curation: "approved", evidenceKind: "original_text", speaker: "unverified", publishedAt: null, retrievedAt: null, truncated: end < full.length }, totalChars: full.length, nextStart: end < full.length ? end : null }) };
  });
  render(<ResearchSourcePassage artistId="artist" source={{ n: 1, sourceId, revision, start: 400 }} />);
  fireEvent.click(screen.getByRole("button", { name: "Source details [1]" }));
  expect(await screen.findByText("By Design")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(2);
});

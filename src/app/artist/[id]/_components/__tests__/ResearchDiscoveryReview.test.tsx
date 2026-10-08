import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ResearchDiscoveryReview from "../ResearchDiscoveryReview";
jest.mock("@privy-io/react-auth", () => ({
  getAccessToken: async () => "privy-token",
}));
const id = "11111111-1111-4111-8111-111111111111",
  evidenceId = "22222222-2222-4222-8222-222222222222",
  revision = "a".repeat(64);
const candidate = {
  id,
  url: "https://artist.example/story",
  destination: "lore",
  platform: null,
  identity: "unresolved",
  curation: "pending",
  reason: "reporting",
  revision,
  title: "A headline to check",
  evidenceId,
};
const original = {
  status: "ok",
  passage: {
    sourceId: `discovery:${evidenceId}`,
    revision,
    start: 0,
    end: 47,
    text: "The source says drums, not production or mixing.",
    url: candidate.url,
    curation: "pending",
    evidenceKind: "original_text",
    speaker: "unverified",
    publishedAt: null,
    retrievedAt: null,
    truncated: false,
  },
  totalChars: 47,
  nextStart: null,
};
beforeEach(() => {
  global.fetch = jest.fn(
    async (url, init) =>
      ({
        ok: true,
        status: 200,
        json: async () =>
          init?.method === "POST"
            ? {
                status: "ok",
                candidate: { ...candidate, curation: "approved" },
              }
            : String(url).includes("/evidence/")
              ? original
              : { status: "ok", candidates: [candidate], nextCursor: null },
      }) as Response,
  );
});
it("loads pending discoveries with Privy and requires original reading before exact-revision review", async () => {
  render(<ResearchDiscoveryReview artistId={id} />);
  await screen.findByText(candidate.title);
  expect(screen.getByRole("button", { name: "Add to Lore" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Read original" }));
  await screen.findByText(original.passage.text);
  fireEvent.click(screen.getByRole("button", { name: "Add to Lore" }));
  await waitFor(() =>
    expect(screen.queryByText(candidate.title)).not.toBeInTheDocument(),
  );
  const request = jest
    .mocked(fetch)
    .mock.calls.find(([, init]) => init?.method === "POST")!;
  expect(request[1]?.headers).toEqual(
    expect.objectContaining({ Authorization: "Bearer privy-token" }),
  );
  expect(JSON.parse(request[1]!.body as string)).toEqual({
    revision,
    decision: "approve",
  });
});
it("keeps a changed-revision conflict visible and does not claim approval", async () => {
  const fetcher = global.fetch;
  global.fetch = jest.fn(async (url, init) =>
    init?.method === "POST"
      ? ({
          ok: false,
          status: 409,
          json: async () => ({ error: "Original changed" }),
        } as Response)
      : fetcher(url, init),
  );
  render(<ResearchDiscoveryReview artistId={id} />);
  await screen.findByText(candidate.title);
  fireEvent.click(screen.getByRole("button", { name: "Read original" }));
  await screen.findByText(original.passage.text);
  fireEvent.click(screen.getByRole("button", { name: "Add to Lore" }));
  await screen.findByText(/changed.*reload/i);
  expect(screen.getByText(candidate.title)).toBeInTheDocument();
});

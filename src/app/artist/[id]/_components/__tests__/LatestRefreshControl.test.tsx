// @ts-nocheck
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
const mockRefresh = jest.fn();
const mockRouter = { refresh: mockRefresh };
jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));
jest.mock("@/lib/musicNerdApi/musicNerdApiUrl", () => ({
  musicNerdApiUrl: (path) => `https://api.example.test${path}`,
}));
jest.mock("@privy-io/react-auth", () => ({ getAccessToken: jest.fn().mockResolvedValue("private-token") }));
const mockTrackEvent = jest.fn();
jest.mock("@/lib/analytics/trackEvent", () => ({ trackEvent: (...a) => mockTrackEvent(...a) }));
import LatestRefreshControl from "../LatestRefreshControl";
import { EditModeContext } from "@/app/_components/EditModeContext";
const renderEditor = () => render(<EditModeContext.Provider value={{ canEdit: true, isEditing: true, toggle: jest.fn() }}><LatestRefreshControl artistId="artist" /></EditModeContext.Provider>);
const response = (refresh) => ({ ok: true, json: async () => ({ refresh }) });
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue(response(null));
});
it("coalesces rapid clicks while editing", async () => {
  renderEditor();
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  global.fetch = jest.fn(() => new Promise(() => {}));
  const button = screen.getByRole("button", { name: "Update Latest" });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  expect(
    screen.getByRole("button", { name: "Updating Latest…" }),
  ).toBeDisabled();
});
it("reads and starts Latest on MusicNerdAPI with the Privy token", async () => {
  renderEditor();
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  const auth = { method: "GET", headers: { Authorization: "Bearer private-token" }, credentials: "omit", cache: "no-store" };
  expect(fetch).toHaveBeenCalledWith("https://api.example.test/api/artist/artist/latest-refresh", expect.objectContaining(auth));
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: "ok", refresh: null }) });
  fireEvent.click(screen.getByRole("button", { name: "Update Latest" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(fetch).toHaveBeenLastCalledWith("https://api.example.test/api/artist/artist/latest-refresh", expect.objectContaining({ ...auth, method: "POST" }));
  expect(fetch.mock.calls.some(([url]) => String(url).startsWith("/api/"))).toBe(false);
});
it("shows partial failure instead of claiming everything is current", async () => {
  fetch.mockResolvedValue(
    response({
      id: "job",
      status: "done",
      retryAt: new Date(Date.now() + 600000).toISOString(),
      sources: {
        instagram: { status: "failed" },
        inprocess: { status: "checked" },
        interviews: { status: "checked" },
        spotify: { status: "disconnected" },
        deezer: { status: "disconnected" },
      },
    }),
  );
  renderEditor();
  await screen.findByText(/Some sources couldn’t update/);
  fireEvent.click(screen.getByRole("button", { name: "View details" }));
  expect(
    screen.getByRole("list", { name: "Source update results" }),
  ).toHaveTextContent("In Process");
  expect(screen.getByText("Couldn’t check")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Update Latest" })).toBeDisabled();
});
it("shows a request failure without a false success message", async () => {
  renderEditor();
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  fetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({
      error: "Only this artist or an admin can update Latest.",
    }),
  });
  fireEvent.click(screen.getByRole("button", { name: "Update Latest" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Only this artist",
  );
});

it("only mounts the refresh flow in authorized edit mode and restores status on re-entry", async () => {
  const view = (isEditing: boolean, canEdit = true) => <EditModeContext.Provider value={{ canEdit, isEditing, toggle: jest.fn() }}><LatestRefreshControl artistId="artist" /></EditModeContext.Provider>;
  const { rerender } = render(view(false));
  expect(screen.queryByRole("button", { name: "Update Latest" })).not.toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
  rerender(view(true));
  expect(screen.getByRole("button", { name: "Update Latest" })).toBeInTheDocument();
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  rerender(view(false));
  expect(screen.queryByRole("button", { name: "Update Latest" })).not.toBeInTheDocument();
  rerender(view(true, false));
  expect(screen.queryByRole("button", { name: "Update Latest" })).not.toBeInTheDocument();
  rerender(view(true));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
});

it("advances a running check on MusicNerdAPI, then reads its status here", async () => {
  const running = { id: "job", status: "pending", retryAt: new Date().toISOString(), sources: { instagram: { status: "pending" } } };
  fetch.mockResolvedValue(response(running));
  renderEditor();
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith("https://api.example.test/api/research/advance", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artistId: "artist", kinds: ["latest_refresh"] }),
    })),
  );
  expect(fetch.mock.calls.some(([url]) => String(url).endsWith("/latest-refresh/advance"))).toBe(false);
});

it("does not invalidate profile navigation while a worker slice is still pending", async () => {
  const running = { id: "job", status: "running", retryAt: new Date().toISOString(), sources: {} };
  fetch.mockResolvedValue(response(running));
  const { unmount } = renderEditor();
  await waitFor(() => expect(fetch.mock.calls.filter(([url]) => String(url).endsWith("/latest-refresh"))).toHaveLength(2));
  expect(mockRefresh).not.toHaveBeenCalled();
  unmount();
});

it("refreshes the profile once on completion, then stops advancing", async () => {
  const pending = { id: "job", status: "pending", retryAt: new Date().toISOString(), sources: {} };
  const done = { ...pending, status: "done" };
  fetch.mockResolvedValueOnce(response(pending))
    .mockResolvedValueOnce({ ok: true })
    .mockResolvedValueOnce(response(done));
  renderEditor();
  await screen.findByText("Latest checked.");
  expect(mockRefresh).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(3);
});

it("keeps a late worker response from refreshing the next artist, and restores saved status on return", async () => {
  let finishAdvance;
  const pending = { id: "job", status: "running", retryAt: new Date().toISOString(), sources: {} };
  const done = { ...pending, status: "done" };
  fetch.mockResolvedValueOnce(response(pending))
    .mockImplementationOnce(() => new Promise(resolve => { finishAdvance = resolve; }));
  const first = renderEditor();
  await waitFor(() => expect(finishAdvance).toBeDefined());
  const signal = fetch.mock.calls[1][1].signal;
  first.unmount();
  expect(signal.aborted).toBe(true);
  fetch.mockResolvedValue(response(done));
  finishAdvance({ ok: true });
  renderEditor();
  await screen.findByText("Latest checked.");
  expect(mockRefresh).not.toHaveBeenCalled();
  expect(fetch.mock.calls.filter(([url]) => String(url).endsWith("/latest-refresh"))).toHaveLength(2);
});

it.each([
  [{ ok: true, json: async () => ({ refresh: null }) }, "started"],
  [{ ok: false, json: async () => ({ error: "Try again in 10 minutes." }) }, "error"],
])("tracks each Check for updates click and whether it started", async (reply, outcome) => {
  renderEditor();
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  fetch.mockResolvedValueOnce(reply);
  fireEvent.click(screen.getByRole("button", { name: "Update Latest" }));
  await waitFor(() => expect(mockTrackEvent).toHaveBeenCalledWith("check_for_updates", { outcome }));
  expect(mockTrackEvent).toHaveBeenCalledTimes(1);
});
it("explains a verified empty Instagram window in details", async () => {
  fetch.mockResolvedValue(response({id:"j",status:"done",retryAt:new Date(Date.now()+600000).toISOString(), sources:{instagram:{status:"checked",detail:"no_new_posts"}}}));
  renderEditor();
  await screen.findByRole("button",{name:"View details"});
  fireEvent.click(screen.getByRole("button",{name:"View details"}));
  expect(screen.getByText("No new posts")).toBeInTheDocument();
});

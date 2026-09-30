// @ts-nocheck
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));
jest.mock("@/lib/musicNerdApi/musicNerdApiUrl", () => ({
  musicNerdApiUrl: (path) => `https://api.example.test${path}`,
}));
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
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(
    screen.getByRole("button", { name: "Updating Latest…" }),
  ).toBeDisabled();
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
      body: JSON.stringify({ artistId: "artist" }),
    })),
  );
  expect(fetch.mock.calls.some(([url]) => String(url).endsWith("/latest-refresh/advance"))).toBe(false);
});

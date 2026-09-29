// @ts-nocheck
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));
import LatestRefreshControl from "../LatestRefreshControl";
const response = (refresh) => ({ ok: true, json: async () => ({ refresh }) });
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue(response(null));
});
it("offers the same action outside edit mode and coalesces rapid clicks", async () => {
  render(<LatestRefreshControl artistId="artist" />);
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
  render(<LatestRefreshControl artistId="artist" />);
  await screen.findByText(/Some sources couldn’t update/);
  fireEvent.click(screen.getByRole("button", { name: "View details" }));
  expect(
    screen.getByRole("list", { name: "Source update results" }),
  ).toHaveTextContent("In Process");
  expect(screen.getByText("Couldn’t check")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Update Latest" })).toBeDisabled();
});
it("shows a request failure without a false success message", async () => {
  render(<LatestRefreshControl artistId="artist" />);
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

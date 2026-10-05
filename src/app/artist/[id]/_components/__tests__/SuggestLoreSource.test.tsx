import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { useSession } from "next-auth/react";
import SuggestLoreSource from "../SuggestLoreSource";

const refresh = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

jest.mock("next-auth/react", () => ({ useSession: jest.fn() }));
jest.mock("@/app/_components/nav/components/requestLogin", () => ({ requestLogin: jest.fn() }));

const artistId = "8b3d9163-a184-468e-8772-cdd73f260835";

describe("SuggestLoreSource", () => {
  beforeEach(() => refresh.mockClear());
  afterEach(() => { cleanup(); jest.restoreAllMocks(); });

  it("asks a signed-out visitor to log in before entering a URL", async () => {
    (useSession as jest.Mock).mockReturnValue({ data: null, status: "unauthenticated" });
    const { requestLogin } = await import("@/app/_components/nav/components/requestLogin");
    render(<SuggestLoreSource artistId={artistId} isClaimed />);
    fireEvent.click(screen.getByRole("button", { name: "Suggest a Lore source" }));
    expect(requestLogin).toHaveBeenCalledWith("add_link");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("opens a dialog and submits multiple distinct URLs for artist review", async () => {
    (useSession as jest.Mock).mockReturnValue({ data: { user: { id: "visitor" } }, status: "authenticated" });
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ success: true }) } as Response);
    render(<SuggestLoreSource artistId={artistId} isClaimed />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Suggest a Lore source" }));
    const dialog = screen.getByRole("dialog", { name: "Suggest a Lore source" });
    const input = screen.getByRole("textbox", { name: "Source URL" });

    fireEvent.change(input, { target: { value: "pitchfork.com/bike-lane" } });
    fireEvent.submit(dialog.querySelector("form")!);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Submitted for artist review"));
    expect(input).toHaveValue("");

    fireEvent.change(input, { target: { value: "https://example.com/interview" } });
    fireEvent.submit(dialog.querySelector("form")!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ url: "https://pitchfork.com/bike-lane" });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ url: "https://example.com/interview" });

    await waitFor(() => expect(dialog.querySelector("form")).toHaveAttribute("aria-busy", "false"));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Suggest a Lore source" }));
    expect(screen.getByRole("textbox", { name: "Source URL" })).toHaveValue("");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows a duplicate error and keeps the submitted URL for correction", async () => {
    (useSession as jest.Mock).mockReturnValue({ data: { user: { id: "visitor" } }, status: "authenticated" });
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: false, json: async () => ({ error: "This source has already been suggested" }) } as Response);
    render(<SuggestLoreSource artistId={artistId} isClaimed />);
    fireEvent.click(screen.getByRole("button", { name: "Suggest a Lore source" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(screen.getByRole("textbox", { name: "Source URL" }), { target: { value: "https://example.com/a" } });
    fireEvent.submit(dialog.querySelector("form")!);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("already been suggested"));
    expect(screen.getByRole("textbox", { name: "Source URL" })).toHaveValue("https://example.com/a");
  });

  it("explains admin review when the artist profile is unclaimed", async () => {
    (useSession as jest.Mock).mockReturnValue({ data: { user: { id: "visitor" } }, status: "authenticated" });
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ success: true }) } as Response);
    render(<SuggestLoreSource artistId={artistId} isClaimed={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Suggest a Lore source" }));
    const dialog = screen.getByRole("dialog");
    expect(screen.getByText(/This profile is unclaimed/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Source URL" }), { target: { value: "https://example.com/a" } });
    fireEvent.submit(dialog.querySelector("form")!);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/An admin can approve it/));
  });

  it.each([true, false])("adds trusted Lore without an artist-review message (claimed: %s)", async isClaimed => {
    (useSession as jest.Mock).mockReturnValue({ data: { user: { id: "trusted" } }, status: "authenticated" });
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ success: true, status: "approved" }) } as Response);
    render(<SuggestLoreSource artistId={artistId} isClaimed={isClaimed} autoApprove />);
    fireEvent.click(screen.getByRole("button", { name: "Add a Lore source" }));
    expect(screen.getByText(/approved automatically/)).toBeInTheDocument();
    expect(screen.queryByText(/The artist will review/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Source URL" }), { target: { value: "https://example.com/interview" } });
    fireEvent.click(screen.getByRole("button", { name: "Add source" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Added to Lore. You can add another source."));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("uses the returned pending status when whitelist access changed after loading", async () => {
    (useSession as jest.Mock).mockReturnValue({ data: { user: { id: "trusted" } }, status: "authenticated" });
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ success: true, status: "pending" }) } as Response);
    render(<SuggestLoreSource artistId={artistId} isClaimed autoApprove />);
    fireEvent.click(screen.getByRole("button", { name: "Add a Lore source" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Source URL" }), { target: { value: "https://example.com/interview" } });
    fireEvent.click(screen.getByRole("button", { name: "Add source" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Submitted for artist review"));
    expect(screen.getByRole("status")).not.toHaveTextContent("Added to Lore");
  });

  it("shows a saved-source refresh warning without asking the user to resubmit", async () => {
    (useSession as jest.Mock).mockReturnValue({ data: { user: { id: "visitor" } }, status: "authenticated" });
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ success: true, status: "approved", warning: "Source saved, but the Lore refresh could not start." }) } as Response);
    render(<SuggestLoreSource artistId={artistId} isClaimed />);
    fireEvent.click(screen.getByRole("button", { name: "Suggest a Lore source" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Source URL" }), { target: { value: "https://example.com/interview" } });
    fireEvent.click(screen.getByRole("button", { name: "Suggest source" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Source saved, but the Lore refresh could not start."));
    expect(screen.getByRole("textbox", { name: "Source URL" })).toHaveValue("");
    expect(refresh).toHaveBeenCalled();
  });
});

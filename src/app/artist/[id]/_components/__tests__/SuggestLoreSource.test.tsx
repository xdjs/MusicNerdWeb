import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { useSession } from "next-auth/react";
import SuggestLoreSource from "../SuggestLoreSource";

jest.mock("next-auth/react", () => ({ useSession: jest.fn() }));
jest.mock("@/app/_components/nav/components/requestLogin", () => ({ requestLogin: jest.fn() }));

const artistId = "8b3d9163-a184-468e-8772-cdd73f260835";

describe("SuggestLoreSource", () => {
  afterEach(() => { cleanup(); jest.restoreAllMocks(); });

  it("asks a signed-out visitor to log in before entering a URL", async () => {
    (useSession as jest.Mock).mockReturnValue({ data: null, status: "unauthenticated" });
    const { requestLogin } = await import("@/app/_components/nav/components/requestLogin");
    render(<SuggestLoreSource artistId={artistId} isClaimed />);
    fireEvent.click(screen.getByRole("button", { name: "Suggest a Lore source" }));
    expect(requestLogin).toHaveBeenCalledWith("add_link");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("submits multiple distinct URLs for artist review without losing the form", async () => {
    (useSession as jest.Mock).mockReturnValue({ data: { user: { id: "visitor" } }, status: "authenticated" });
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ success: true }) } as Response);
    const { container } = render(<SuggestLoreSource artistId={artistId} isClaimed />);
    const input = screen.getByRole("textbox", { name: "Suggest a Lore source" });

    fireEvent.change(input, { target: { value: "pitchfork.com/bike-lane" } });
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Submitted for artist review"));
    expect(input).toHaveValue("");

    fireEvent.change(input, { target: { value: "https://example.com/interview" } });
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ url: "https://pitchfork.com/bike-lane" });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ url: "https://example.com/interview" });
  });

  it("shows a duplicate error and keeps the submitted URL for correction", async () => {
    (useSession as jest.Mock).mockReturnValue({ data: { user: { id: "visitor" } }, status: "authenticated" });
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: false, json: async () => ({ error: "This source has already been suggested" }) } as Response);
    const { container } = render(<SuggestLoreSource artistId={artistId} isClaimed />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "https://example.com/a" } });
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("already been suggested"));
    expect(screen.getByRole("textbox")).toHaveValue("https://example.com/a");
  });

  it("explains admin review when the artist profile is unclaimed", async () => {
    (useSession as jest.Mock).mockReturnValue({ data: { user: { id: "visitor" } }, status: "authenticated" });
    jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => ({ success: true }) } as Response);
    const { container } = render(<SuggestLoreSource artistId={artistId} isClaimed={false} />);
    expect(screen.getByText(/This profile is unclaimed/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "https://example.com/a" } });
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/An admin can approve it/));
  });
});

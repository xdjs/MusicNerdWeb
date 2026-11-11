import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TrustedLoreUpload from "../TrustedLoreUpload";
import { requestVaultUpload } from "@/lib/source/requestVaultUpload";
const mockRefresh = jest.fn();
const mockToast = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));
jest.mock("@/lib/source/requestVaultUpload", () => ({
  requestVaultUpload: jest.fn(),
}));
const request = jest.mocked(requestVaultUpload);
const response = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue(response(200, {}));
});
it("uses sign/complete only, retains ticket after uncertainty and exposes no editor controls", async () => {
  request
    .mockResolvedValueOnce(
      response(200, {
        ticket: "stable",
        signedUrl: "https://fixture.invalid/upload",
        contentType: "text/plain",
      }),
    )
    .mockResolvedValueOnce(
      response(503, { error: "Retry same file", retryCompletion: true }),
    )
    .mockResolvedValueOnce(
      response(200, { source: { id: "source" }, receiptOnly: true }),
    );
  render(<TrustedLoreUpload artistId="artist" />);
  const file = new File(["body"], "a.txt", {
    type: "text/plain",
    lastModified: 1,
  });
  fireEvent.change(screen.getByLabelText("Choose a Lore file"), {
    target: { files: [file] },
  });
  await waitFor(() =>
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Upload needs attention" }),
    ),
  );
  fireEvent.change(screen.getByLabelText("Choose a Lore file"), {
    target: { files: [file] },
  });
  await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
  expect(request.mock.calls.map((call) => call[0])).toEqual([
    "sign",
    "complete",
    "complete",
  ]);
  expect(request.mock.calls[2]).toEqual(["complete", { ticket: "stable" }]);
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Regenerate About")).not.toBeInTheDocument();
});
it("does not upload bytes when server denies contributor authority", async () => {
  request.mockResolvedValueOnce(response(403, { error: "Not authorized" }));
  render(<TrustedLoreUpload artistId="artist" />);
  fireEvent.change(screen.getByLabelText("Choose a Lore file"), {
    target: { files: [new File(["body"], "a.txt", { type: "text/plain" })] },
  });
  await waitFor(() => expect(mockToast).toHaveBeenCalled());
  expect(global.fetch).not.toHaveBeenCalled();
  expect(mockRefresh).not.toHaveBeenCalled();
});

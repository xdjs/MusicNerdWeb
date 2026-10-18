import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import InterviewResponseCard from "../InterviewResponseCard";
import { requestInterviewResponses } from "@/lib/interviewResponses/requestInterviewResponses";
jest.mock("@/lib/interviewResponses/requestInterviewResponses", () => ({
  requestInterviewResponses: jest.fn(),
}));
const request = requestInterviewResponses as jest.Mock;
const response = {
  id: "a",
  questionKey: "q",
  question: "Which take?",
  answer: "  Home.\nOnly the demo.  ",
  source: "followup",
  sitting: 2,
  offeredAt: "2026-10-01T00:00:00Z",
  answerUpdatedAt: "2026-10-02T00:00:00Z",
  revision: "a".repeat(64),
};
beforeEach(() => jest.clearAllMocks());
it("saves exact wording against the revision read and keeps offer context", async () => {
  request.mockResolvedValue({
    status: "ok",
    response: {
      ...response,
      answer: "  Studio.\nRelease only.  ",
      revision: "b".repeat(64),
    },
    isCurrent: true,
  });
  render(<InterviewResponseCard artistId="artist" response={response} />);
  fireEvent.click(screen.getByRole("button", { name: "Edit response" }));
  expect(screen.getByRole("button", { name: "Save response" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Your response"), {
    target: { value: "  Studio.\nRelease only.  " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save response" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      "artist",
      "/a",
      expect.anything(),
      expect.objectContaining({
        body: {
          expectedRevision: response.revision,
          answer: "  Studio.\nRelease only.  ",
          note: "",
        },
      }),
    ),
  );
  await screen.findByText(/Lore is updating/);
});
it("keeps the draft after a conflicting edit and lets the artist read the latest saved wording", async () => {
  request.mockRejectedValueOnce(
    new Error(
      "This response changed. Read the latest saved response before saving again.",
    ),
  );
  render(<InterviewResponseCard artistId="artist" response={response} />);
  fireEvent.click(screen.getByRole("button", { name: "Edit response" }));
  fireEvent.change(screen.getByLabelText("Your response"), {
    target: { value: "My unfinished edit" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save response" }));
  await screen.findByRole("alert");
  expect(screen.getByLabelText("Your response")).toHaveValue(
    "My unfinished edit",
  );
});

it("edits inline with a pencil, cancels without writing, and saves through the revision endpoint", async () => {
  const onSaved = jest.fn();
  const onUnsavedChange = jest.fn();
  render(<InterviewResponseCard artistId="artist" response={response} inline onSaved={onSaved} onUnsavedChange={onUnsavedChange} />);
  const pencil = screen.getByRole("button", { name: "Edit response" });
  expect(pencil).toHaveAttribute("title", "Edit response");
  fireEvent.click(pencil);
  fireEvent.change(screen.getByLabelText("Your response"), { target: { value: "Discard this draft" } });
  expect(onUnsavedChange).toHaveBeenLastCalledWith(response.id, true);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(request).not.toHaveBeenCalled();
  expect(onUnsavedChange).toHaveBeenLastCalledWith(response.id, false);
  fireEvent.click(screen.getByRole("button", { name: "Edit response" }));
  expect(screen.getByLabelText("Your response")).toHaveValue(response.answer);
  const revised = { ...response, answer: "Exact revised words", revision: "b".repeat(64) };
  request.mockResolvedValue({ status: "ok", response: revised, isCurrent: true });
  fireEvent.change(screen.getByLabelText("Your response"), { target: { value: revised.answer } });
  fireEvent.click(screen.getByRole("button", { name: "Save response" }));
  await screen.findByText(/Response saved/);
  expect(onSaved).toHaveBeenCalledWith(revised);
  expect(request).toHaveBeenCalledWith("artist", "/a", expect.anything(), { body: { expectedRevision: response.revision, answer: revised.answer, note: "" } });
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(screen.getByText(revised.answer)).toBeVisible();
});

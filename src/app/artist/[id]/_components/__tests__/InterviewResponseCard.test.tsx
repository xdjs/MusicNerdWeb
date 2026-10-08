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

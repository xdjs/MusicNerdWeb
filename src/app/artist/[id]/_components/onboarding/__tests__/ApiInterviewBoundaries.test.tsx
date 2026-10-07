import { render, screen, fireEvent } from "@testing-library/react";
import ApiInterviewBoundaries from "../ApiInterviewBoundaries";
const id = "11111111-1111-4111-8111-111111111111",
  revision = "a".repeat(64);
const boundary = {
  entryId: `boundary:${id}`,
  kind: "boundary",
  metadata: { scope: "until_retracted", boundaryRevision: revision },
  fields: [
    { name: "wording", text: " Please leave my family out. ", complete: true },
  ],
};
it("restores exact instructions and retracts only the selected saved revision", async () => {
  const call = jest
    .fn()
    .mockResolvedValueOnce({ constraintsComplete: true, entries: [boundary] })
    .mockResolvedValueOnce({ status: "ok" })
    .mockResolvedValueOnce({ constraintsComplete: true, entries: [] });
  render(<ApiInterviewBoundaries questionKey="q" busy={false} call={call} />);
  fireEvent.click(screen.getByRole("button", { name: "Topic preferences" }));
  await screen.findByText("Please leave my family out.");
  fireEvent.click(screen.getByRole("button", { name: "Remove instruction" }));
  await screen.findByText("No active topic instructions.");
  expect(call).toHaveBeenNthCalledWith(2, {
    action: "retract",
    boundaryId: id,
    revision,
  });
});
it("keeps exact wording and an explicit scope when the artist saves", async () => {
  const call = jest
    .fn()
    .mockResolvedValueOnce({ constraintsComplete: true, entries: [] })
    .mockResolvedValueOnce({ status: "ok" })
    .mockResolvedValueOnce({ constraintsComplete: true, entries: [boundary] });
  render(<ApiInterviewBoundaries questionKey="q" busy={false} call={call} />);
  fireEvent.click(screen.getByRole("button", { name: "Topic preferences" }));
  await screen.findByText("No active topic instructions.");
  fireEvent.change(screen.getByLabelText("Your topic instruction"), {
    target: { value: " Please leave my family out. " },
  });
  fireEvent.change(screen.getByLabelText("Keep this instruction"), {
    target: { value: "until_retracted" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Save topic instruction" }),
  );
  await screen.findByText("Please leave my family out.");
  expect(call).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      action: "boundary",
      wording: " Please leave my family out. ",
      scope: "until_retracted",
      questionKey: "q",
    }),
  );
});
it("does not turn incomplete memory into an empty instruction list", async () => {
  render(
    <ApiInterviewBoundaries
      questionKey="q"
      busy={false}
      call={jest
        .fn()
        .mockResolvedValue({ constraintsComplete: false, entries: [] })}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Topic preferences" }));
  await screen.findByRole("alert");
  expect(
    screen.queryByText("No active topic instructions."),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Save topic instruction" }),
  ).toBeDisabled();
});

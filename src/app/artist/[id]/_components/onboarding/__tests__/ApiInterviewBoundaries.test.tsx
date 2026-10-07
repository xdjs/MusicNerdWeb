import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ApiInterviewBoundaries from "../ApiInterviewBoundaries";
const id = "11111111-1111-4111-8111-111111111111",
  revision = "a".repeat(64);
const boundary = {
  id,
  revision,
  wording: " Please leave my family out. ",
  scope: "until_retracted",
};
const page = (boundaries: unknown[], nextCursor: string | null = null) => ({
  status: "ok",
  sitting: 2,
  boundaries,
  nextCursor,
});

it("restores exact instructions and retracts only the selected saved revision", async () => {
  const call = jest
    .fn()
    .mockResolvedValueOnce(page([boundary]))
    .mockResolvedValueOnce({ status: "ok" })
    .mockResolvedValueOnce(page([]));
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
    .mockResolvedValueOnce(page([]))
    .mockResolvedValueOnce({ status: "ok" })
    .mockResolvedValueOnce(page([boundary]));
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
it("does not turn an invalid boundary page into an empty instruction list", async () => {
  render(
    <ApiInterviewBoundaries
      questionKey="q"
      busy={false}
      call={jest.fn().mockResolvedValue({ status: "ok", boundaries: [] })}
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
it("allows reviewing and retracting existing instructions before a new question exists", async () => {
  const call = jest
    .fn()
    .mockResolvedValueOnce(page([boundary]))
    .mockResolvedValueOnce({ status: "ok" })
    .mockResolvedValueOnce(page([]));
  render(
    <ApiInterviewBoundaries questionKey={null} busy={false} call={call} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Topic preferences" }));
  await screen.findByText("Please leave my family out.");
  expect(
    screen.queryByRole("button", { name: "Save topic instruction" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Remove instruction" }));
  await screen.findByText("No active topic instructions.");
  expect(call).toHaveBeenNthCalledWith(2, {
    action: "retract",
    boundaryId: id,
    revision,
  });
});

it("pages and retracts exact instructions beyond the model memory budget in a fresh client", async () => {
  const all = Array.from({ length: 50 }, (_, i) => ({
    ...boundary,
    id: `11111111-1111-4111-8111-${String(i).padStart(12, "0")}`,
    wording: ` Instruction ${i} ${"x".repeat(3980)} `.padEnd(4000, " "),
  }));
  const call = jest.fn(async (body) => {
    if (body.action === "boundaries") {
      const start = Number(body.cursor ?? 0);
      return page(
        all.slice(start, start + 5),
        start + 5 < all.length ? String(start + 5) : null,
      );
    }
    if (body.action === "retract") return { status: "ok" };
    throw new Error("Mandatory memory exceeds its context budget");
  });
  render(
    <ApiInterviewBoundaries questionKey={null} busy={false} call={call} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Topic preferences" }));
  for (let count = 5; count <= 50; count += 5) {
    await waitFor(() =>
      expect(
        screen.getAllByRole("button", { name: "Remove instruction" }),
      ).toHaveLength(count),
    );
    if (count < 50)
      fireEvent.click(
        screen.getByRole("button", { name: "Show more instructions" }),
      );
  }
  expect(
    screen.queryByRole("button", { name: "Show more instructions" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText(
      (_, node) =>
        node?.tagName === "P" && node.textContent === all[49].wording,
    ),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getAllByRole("button", { name: "Remove instruction" })[49],
  );
  await waitFor(() =>
    expect(call).toHaveBeenCalledWith({
      action: "retract",
      boundaryId: all[49].id,
      revision,
    }),
  );
  expect(call.mock.calls.every(([body]) => body.action !== "memory")).toBe(
    true,
  );
  await waitFor(() =>
    expect(
      screen.getAllByRole("button", { name: "Remove instruction" }),
    ).toHaveLength(5),
  );
});
it("clears stale pages after a failed continuation and provides an explicit reload", async () => {
  const call = jest
    .fn()
    .mockResolvedValueOnce(page([boundary], "next"))
    .mockRejectedValueOnce(new Error("The interview changed"))
    .mockResolvedValueOnce(
      page([{ ...boundary, wording: "Updated instruction" }]),
    );
  render(
    <ApiInterviewBoundaries questionKey={null} busy={false} call={call} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Topic preferences" }));
  await screen.findByText("Please leave my family out.");
  fireEvent.click(
    screen.getByRole("button", { name: "Show more instructions" }),
  );
  await screen.findByRole("alert");
  expect(
    screen.queryByText("Please leave my family out."),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText("No active topic instructions."),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Remove instruction" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reload instructions" }));
  await screen.findByText("Updated instruction");
  expect(call).toHaveBeenNthCalledWith(2, {
    action: "boundaries",
    cursor: "next",
  });
  expect(call).toHaveBeenNthCalledWith(3, { action: "boundaries" });
});
it("keeps the exact draft and idempotency key when saving succeeds but refreshing fails", async () => {
  const call = jest
    .fn()
    .mockResolvedValueOnce(page([]))
    .mockResolvedValueOnce({ status: "ok" })
    .mockRejectedValueOnce(new Error("Temporary read failure"))
    .mockResolvedValueOnce(page([boundary]))
    .mockResolvedValueOnce({ status: "ok" })
    .mockResolvedValueOnce(page([boundary]));
  render(<ApiInterviewBoundaries questionKey="q" busy={false} call={call} />);
  fireEvent.click(screen.getByRole("button", { name: "Topic preferences" }));
  await screen.findByText("No active topic instructions.");
  fireEvent.change(screen.getByLabelText("Your topic instruction"), {
    target: { value: boundary.wording },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Save topic instruction" }),
  );
  await screen.findByRole("alert");
  expect(screen.getByLabelText("Your topic instruction")).toHaveValue(
    boundary.wording,
  );
  fireEvent.click(screen.getByRole("button", { name: "Reload instructions" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Save topic instruction" }),
    ).toBeEnabled(),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Save topic instruction" }),
  );
  await screen.findByText("Please leave my family out.");
  await waitFor(() => expect(call).toHaveBeenCalledTimes(6));
  expect(call.mock.calls[4][0]).toEqual(call.mock.calls[1][0]);
  await waitFor(() =>
    expect(screen.getByLabelText("Your topic instruction")).toHaveValue(""),
  );
});

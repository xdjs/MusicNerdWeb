import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ApiInterview from "../ApiInterview";
const token = jest.fn(async () => "token");
jest.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({
    ready: true,
    authenticated: true,
    user: { id: "account" },
    getAccessToken: token,
  }),
}));
const artist = "11111111-1111-4111-8111-111111111111",
  session = "22222222-2222-4222-8222-222222222222",
  qid = "33333333-3333-4333-8333-333333333333";
const question = {
  id: qid,
  questionKey: "api:q",
  question: "What do you think led to that sound?",
  answer: null,
  state: "offered",
  revision: "a".repeat(64),
  sitting: 1,
  offeredAt: "2026-10-06",
  answerUpdatedAt: "2026-10-06",
  ordinal: 1,
  references: [],
};
const empty = { status: "ok", session: null, legacyOffers: [] };
const active = {
  status: "ok",
  session: {
    id: session,
    sitting: 1,
    state: "active",
    createdAt: "2026-10-06",
    closedAt: null,
    questions: [question],
  },
  legacyOffers: [],
};
const reply = (body: unknown, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => body,
});
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue(reply(empty));
});
it("reads only on mount and generates solely after explicit Start", async () => {
  jest
    .mocked(fetch)
    .mockResolvedValueOnce(reply(empty) as Response)
    .mockResolvedValueOnce(reply(active) as Response);
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Start interview" }),
  );
  await screen.findByText(question.question);
  expect(jest.mocked(fetch).mock.calls[0][1]?.method).toBe("GET");
  expect(
    JSON.parse(jest.mocked(fetch).mock.calls[1][1]?.body as string),
  ).toMatchObject({ action: "start" });
});
it("resumes the exact existing question without generating or writing on mount", async () => {
  jest.mocked(fetch).mockResolvedValue(reply(active) as Response);
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  await screen.findByText(question.question);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(jest.mocked(fetch).mock.calls[0][1]?.method).toBe("GET");
});
it("saves exact words and waits for Continue before preparing the next question", async () => {
  jest
    .mocked(fetch)
    .mockResolvedValueOnce(reply(active) as Response)
    .mockResolvedValueOnce(
      reply({
        ...active,
        session: {
          ...active.session,
          questions: [
            { ...question, state: "answered", answer: "  Exact words. 🥁  " },
          ],
        },
      }) as Response,
    );
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  const input = await screen.findByLabelText("Your answer");
  fireEvent.change(input, { target: { value: "  Exact words. 🥁  " } });
  fireEvent.click(screen.getByRole("button", { name: "Save answer" }));
  await screen.findByRole("button", { name: "Continue interview" });
  expect(
    JSON.parse(jest.mocked(fetch).mock.calls[1][1]?.body as string),
  ).toEqual({
    action: "answer",
    answerId: qid,
    expectedRevision: "a".repeat(64),
    answer: "  Exact words. 🥁  ",
  });
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("retains unsaved words after a failed save and never treats a skip as a boundary", async () => {
  jest
    .mocked(fetch)
    .mockResolvedValueOnce(reply(active) as Response)
    .mockResolvedValueOnce(
      reply({ error: "The interview changed." }, 409) as Response,
    );
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.change(await screen.findByLabelText("Your answer"), {
    target: { value: "Keep these words." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save answer" }));
  await screen.findByRole("alert");
  expect(screen.getByLabelText("Your answer")).toHaveValue("Keep these words.");
  jest.mocked(fetch).mockResolvedValue(
    reply({
      ...active,
      session: {
        ...active.session,
        questions: [{ ...question, state: "skipped" }],
      },
    }) as Response,
  );
  fireEvent.click(screen.getByRole("button", { name: "Skip question" }));
  await screen.findByRole("button", { name: "Continue interview" });
  expect(
    JSON.parse(jest.mocked(fetch).mock.calls[2][1]?.body as string),
  ).toMatchObject({ action: "answer", answer: null });
});
it("hides the previous artist immediately during navigation and aborts the old request", async () => {
  jest
    .mocked(fetch)
    .mockResolvedValueOnce(reply(active) as Response)
    .mockImplementationOnce(() => new Promise(() => {}));
  const { rerender } = render(
    <ApiInterview artistId={artist} artistName="Artist" />,
  );
  await screen.findByText(question.question);
  const signal = jest.mocked(fetch).mock.calls[0][1]?.signal;
  rerender(<ApiInterview artistId={qid} artistName="Another artist" />);
  expect(screen.queryByText(question.question)).not.toBeInTheDocument();
  await waitFor(() => expect(signal?.aborted).toBe(true));
});

it("starts a new sitting with a new request id after finishing without a reload", async () => {
  const ids = [
    "44444444-4444-4444-8444-444444444444",
    "55555555-5555-4555-8555-555555555555",
  ];
  const random = jest
    .spyOn(crypto, "randomUUID")
    .mockReturnValueOnce(
      ids[0] as `${string}-${string}-${string}-${string}-${string}`,
    )
    .mockReturnValueOnce(
      ids[1] as `${string}-${string}-${string}-${string}-${string}`,
    );
  jest
    .mocked(fetch)
    .mockResolvedValueOnce(reply(empty) as Response)
    .mockResolvedValueOnce(reply(active) as Response)
    .mockResolvedValueOnce(
      reply({
        ...active,
        session: {
          ...active.session,
          state: "finished",
          closedAt: "2026-10-06",
          questions: [{ ...question, state: "skipped" }],
        },
      }) as Response,
    )
    .mockResolvedValueOnce(
      reply({
        ...active,
        session: { ...active.session, id: qid, sitting: 2 },
      }) as Response,
    );
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Start interview" }),
  );
  await screen.findByText(question.question);
  fireEvent.click(screen.getByRole("button", { name: "Finish interview" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Start interview" }),
  );
  await screen.findByText(question.question);
  const starts = jest
    .mocked(fetch)
    .mock.calls.map((call) =>
      call[1]?.body ? JSON.parse(call[1].body as string) : null,
    )
    .filter((body) => body?.action === "start");
  expect(starts.map((body) => body.requestId)).toEqual(ids);
  random.mockRestore();
});
it("does not claim an answer is saved when the first question has not been offered", async () => {
  jest.mocked(fetch).mockResolvedValue(
    reply({
      ...active,
      session: { ...active.session, questions: [] },
    }) as Response,
  );
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  await screen.findByRole("button", { name: "Continue interview" });
  expect(screen.queryByText(/Your answer is saved/)).not.toBeInTheDocument();
});
it("keeps topic preferences available in a new sitting before any question exists", async () => {
  jest
    .mocked(fetch)
    .mockResolvedValue(
      reply({
        ...active,
        session: { ...active.session, questions: [] },
      }) as Response,
    );
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  await screen.findByRole("button", { name: "Continue interview" });
  expect(
    screen.getByRole("button", { name: "Topic preferences" }),
  ).toBeEnabled();
});

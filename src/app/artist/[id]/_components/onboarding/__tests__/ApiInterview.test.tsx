import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ApiInterview from "../ApiInterview";
const token = jest.fn(async () => "token");
const mockToast = jest.fn();
jest.mock("@/lib/musicNerdApi/musicNerdApiUrl", () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
jest.mock("../useResearchPump", () => ({useResearchPump: jest.fn()}));
jest.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mockToast }) }));
jest.mock("@privy-io/react-auth", () => ({
  getAccessToken: () => token(),
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
  localStorage.clear();
  global.fetch = jest.fn().mockResolvedValue(reply(empty));
});
it("reads only on mount and generates solely after explicit Start", async () => {
  jest
    .mocked(fetch)
    .mockResolvedValueOnce(reply(empty) as Response)
    .mockResolvedValueOnce(reply(active) as Response);
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Interview" }),
  );
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Prepare interview" }));
  await screen.findByText(question.question);
  expect(jest.mocked(fetch).mock.calls[0][1]?.method).toBe("GET");
  expect(
    JSON.parse(jest.mocked(fetch).mock.calls[1][1]?.body as string),
  ).toMatchObject({ action: "start" });
});
it("calls the interview on MusicNerdAPI with the Privy token and no cookies", async () => {
  jest.mocked(fetch).mockResolvedValueOnce(reply(empty) as Response).mockResolvedValueOnce(reply(active) as Response);
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(await screen.findByRole("button", { name: "Interview" }));
  fireEvent.click(screen.getByRole("button", { name: "Prepare interview" }));
  await screen.findByText(question.question);
  for (const [url, init] of jest.mocked(fetch).mock.calls) {
    expect(url).toBe(`https://api-preview.test/api/artist/${artist}/interview`);
    expect(init).toMatchObject({ credentials: "omit", headers: { Authorization: "Bearer token" } });
  }
});
it("resumes the exact existing question without generating or writing on mount", async () => {
  jest.mocked(fetch).mockResolvedValue(reply(active) as Response);
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.click(await screen.findByRole("button", { name: "Resume interview" }));
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
  fireEvent.click(await screen.findByRole("button", { name: "Resume interview" }));
  const input = await screen.findByLabelText("Your answer");
  fireEvent.change(input, { target: { value: "  Exact words. 🥁  " } });
  fireEvent.click(screen.getByRole("button", { name: "Save & continue" }));
  await screen.findByRole("button", { name: "Prepare next question" });
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
it("retains exact queued words after failure and retries without overwriting them", async () => {
  jest.mocked(fetch).mockResolvedValueOnce(reply(active) as Response).mockResolvedValueOnce(reply({ error: "Unavailable" }, 503) as Response);
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(await screen.findByRole("button", { name: "Resume interview" }));
  fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "Keep these words." } });
  fireEvent.click(screen.getByRole("button", { name: "Save & continue" }));
  await screen.findByRole("alert");
  expect(localStorage.getItem(`mn-interview-outbox:${artist}:account`)).toContain("Keep these words.");
  jest.mocked(fetch).mockResolvedValue(reply({ ...active, session: { ...active.session, questions: [{ ...question, state: "answered", answer: "Keep these words." }] } }) as Response);
  fireEvent.click(screen.getByRole("button", { name: "Retry saving" }));
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  expect(JSON.parse(jest.mocked(fetch).mock.calls[2][1]?.body as string)).toMatchObject({ action: "answer", answer: "Keep these words." });
});
it("hides the previous artist immediately during navigation and aborts the old request", async () => {
  jest
    .mocked(fetch)
    .mockResolvedValueOnce(reply(active) as Response)
    .mockImplementationOnce(() => new Promise(() => {}));
  const { rerender } = render(
    <ApiInterview artistId={artist} artistName="Artist" />,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Resume interview" }));
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
    .mockResolvedValueOnce(reply({...active, session: {...active.session, questions: [{...question, state: "answered", answer: "Saved"}]}}) as Response)
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
    await screen.findByRole("button", { name: "Interview" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Prepare interview" }));
  await screen.findByRole("button", { name: "Finish interview" });
  fireEvent.click(screen.getByRole("button", { name: "Finish interview" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Interview" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Prepare interview" }));
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
  fireEvent.click(await screen.findByRole("button", { name: "Interview" }));
  await screen.findByRole("button", { name: "Prepare next question" });
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
  fireEvent.click(await screen.findByRole("button", { name: "Interview" }));
  await screen.findByRole("button", { name: "Prepare next question" });
  expect(screen.queryByText("Preferences & responses")).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Topic preferences" }),
  ).toBeEnabled();
});

it("keeps the same offered question and draft when closing and reopening without writes", async () => {
  jest.mocked(fetch).mockResolvedValue(reply(active) as Response);
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(await screen.findByRole("button", { name: "Resume interview" }));
  fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "My unfinished words" } });
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "Resume interview" }));
  expect(screen.getByLabelText("Your answer")).toHaveValue("My unfinished words");
  expect(screen.getByText(question.question)).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("allows closing during a save while keeping the durable answer intent", async () => {
  jest.mocked(fetch).mockResolvedValueOnce(reply(active) as Response).mockImplementationOnce(() => new Promise(() => {}));
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(await screen.findByRole("button", { name: "Resume interview" }));
  fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "Still saving" } });
  fireEvent.click(screen.getByRole("button", { name: "Save & continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(localStorage.getItem(`mn-interview-outbox:${artist}:account`)).toContain("Still saving");
});

it("restores a scoped draft after remount and returns focus to the invitation", async () => {
  jest.mocked(fetch).mockResolvedValue(reply(active) as Response);
  const first = render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(await screen.findByRole("button", { name: "Resume interview" }));
  fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "After reload" } });
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Resume interview" })).toHaveFocus());
  first.unmount();
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(await screen.findByRole("button", { name: "Resume interview" }));
  expect(screen.getByLabelText("Your answer")).toHaveValue("After reload");
});
it("keeps the popup and draft open when browser persistence fails", async () => {
  jest.mocked(fetch).mockResolvedValue(reply(active) as Response);
  const write = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Unavailable"); });
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(await screen.findByRole("button", { name: "Resume interview" }));
  fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "Do not lose this" } });
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByLabelText("Your answer")).toHaveValue("Do not lose this");
  expect(screen.getByRole("alert")).toHaveTextContent("could not be saved");
  write.mockRestore();
});

it("does not present a legacy saved question as an active session or generate on opening", async () => {
  jest.mocked(fetch).mockResolvedValue(reply({ ...empty, legacyOffers: [question] }) as Response);
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(await screen.findByRole("button", { name: "Review saved question" }));
  expect(screen.getByText(question.question)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Resume interview" })).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("closes only after Finish succeeds and confirms the saved responses", async () => {
  const answered = { ...active, session: { ...active.session, questions: [{ ...question, state: "answered", answer: "My exact answer" }] } };
  jest.mocked(fetch).mockResolvedValueOnce(reply(answered) as Response).mockResolvedValueOnce(reply({ ...answered, session: { ...answered.session, state: "finished", closedAt: "2026-10-17" } }) as Response);
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(await screen.findByRole("button", { name: "Interview" }));
  expect(screen.getByText("Your responses")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Finish interview" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Interview finished", description: "Edit your responses anytime in Edit profile → Lore → Questions." }));
  expect(screen.getByRole("button", { name: "Interview" })).toBeEnabled();
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("keeps the session and saved responses open when Finish fails", async () => {
  jest.mocked(fetch).mockResolvedValueOnce(reply({...active, session: {...active.session, questions: [{...question, state: "answered", answer: "Keep my answer"}]}}) as Response).mockResolvedValueOnce(reply({ error: "Please retry." }, 503) as Response);
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(await screen.findByRole("button", { name: "Interview" }));
  fireEvent.click(screen.getByRole("button", { name: "Finish interview" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Your responses/ }));
  expect(screen.getByText("Keep my answer")).toBeInTheDocument();
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
  expect(screen.getByRole("dialog", { name: "Your responses" })).toContainElement(screen.getByText("Keep my answer"));
  expect(screen.getByText("Edit your responses anytime in Edit profile → Lore → Questions.")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Finish interview" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Back to interview" }));
  expect(screen.getByRole("button", { name: "Finish interview" })).toBeVisible();
  expect(mockToast).not.toHaveBeenCalled();
});

it("keeps every interview action in one scroll region below the header", async () => {
  jest.mocked(fetch).mockResolvedValue(reply(active) as Response);
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(await screen.findByRole("button", { name: "Resume interview" }));
  const body = screen.getByRole("region", { name: "Interview responses and controls" });
  for (const name of ["Save & continue", "Skip"]) {
    expect(body).toContainElement(screen.getByRole("button", { name }));
  }
  expect(body).not.toContainElement(screen.getByRole("heading", { name: "A few questions" }));
});

it("shows background preparation and allows closing without canceling the saved job", async () => {
  jest.mocked(fetch).mockResolvedValueOnce(reply(empty) as Response).mockResolvedValue(reply({...active, session: {...active.session, questions: []}, preparation: {status: "running"}}) as Response);
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(await screen.findByRole("button", {name: /^Interview$/}));
  fireEvent.click(screen.getByRole("button", {name: "Prepare interview"}));
  await screen.findByText("Preparing your questions…");
  expect(screen.getByRole("status")).toHaveTextContent("Preparing your question");
  expect(screen.queryByRole("button", {name: "Prepare interview"})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name: "Close"}));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("does not open a waiting room from the background-preparation invitation", async () => {
  jest.mocked(fetch).mockResolvedValue(reply({...empty, preparation: {status: "pending"}}) as Response);
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  const invitation = await screen.findByRole("button", {name: "Preparing interview…"});
  expect(invitation).toBeDisabled();
  fireEvent.click(invitation);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("opens a ready question by consuming it, with no new preparation", async () => {
  jest.mocked(fetch).mockResolvedValueOnce(reply({...active, session: {...active.session, questions: []}, preparation: {status: "ready"}}) as Response).mockResolvedValueOnce(reply(active) as Response);
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(await screen.findByRole("button", {name: "Start interview"}));
  await screen.findByText(question.question);
  expect(JSON.parse(jest.mocked(fetch).mock.calls[1][1]?.body as string)).toEqual({action: "continue", sessionId: session});
  expect(screen.queryByRole("button", {name: "Reload saved interview"})).not.toBeInTheDocument();
  expect(screen.queryByRole("button", {name: "Finish interview"})).not.toBeInTheDocument();
});

it("does not pile up status requests when a preparation read is slow", async () => {
  jest.useFakeTimers();
  try {
    jest.mocked(fetch).mockResolvedValueOnce(reply({...active, session: {...active.session, questions: []}, preparation: {status: "running"}}) as Response).mockImplementation(() => new Promise(() => {}));
    const {unmount} = render(<ApiInterview artistId={artist} artistName="Artist" />);
    await screen.findByRole("button", {name: "Preparing interview…"});
    await act(async () => { jest.advanceTimersByTime(9000); });
    expect(fetch).toHaveBeenCalledTimes(2);
    unmount();
  } finally { jest.useRealTimers(); }
});

it("shows how many questions are prepared before starting the session", async () => {
  jest.mocked(fetch).mockResolvedValue(reply({
    ...active,
    session: { ...active.session, questions: [] },
    preparation: { status: "ready", readyCount: 3, totalCount: 3 },
  }) as Response);
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(await screen.findByRole("button", { name: "Start interview" }));
  expect(await screen.findByText("3 questions ready. Answer at your own pace.")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Finish interview" })).not.toBeInTheDocument();
  const start = screen.getAllByRole("button", { name: "Start interview" }).find(button => button.closest('[role="dialog"]'))!;
  expect(start.parentElement).toContainElement(screen.getByRole("button", { name: "Topic preferences" }));
});

it("uses the prepared next question after saving instead of requesting generation", async () => {
  const saved = {
    ...active,
    session: { ...active.session, questions: [{ ...question, state: "answered", answer: "My own words" }] },
    preparation: { status: "ready", readyCount: 2, totalCount: 3 },
  };
  jest.mocked(fetch)
    .mockResolvedValueOnce(reply(active) as Response)
    .mockResolvedValueOnce(reply(saved) as Response)
    .mockResolvedValueOnce(reply({
      ...active,
      session: { ...active.session, questions: [...saved.session.questions, {
        ...question, id: "44444444-4444-4444-8444-444444444444", ordinal: 2,
        question: "How did you decide on that recording space?",
      }] },
    }) as Response);
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(await screen.findByRole("button", { name: "Resume interview" }));
  fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "My own words" } });
  fireEvent.click(screen.getByRole("button", { name: "Save & continue" }));
  fireEvent.click(await screen.findByRole("button", { name: "Next question" }));
  expect(await screen.findByText("How did you decide on that recording space?")).toBeVisible();
  expect(JSON.parse(jest.mocked(fetch).mock.calls[2][1]?.body as string)).toEqual({ action: "continue", sessionId: session });
});

it("advances to the next offered question before a slow save completes", async () => {
  const next = { ...question, id: "44444444-4444-4444-8444-444444444444", ordinal: 2, question: "What happened at the next show?" };
  jest.mocked(fetch).mockResolvedValueOnce(reply({ ...active, session: { ...active.session, questions: [question, next] } }) as Response)
    .mockImplementationOnce(() => new Promise(() => {}));
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(await screen.findByRole("button", { name: "Resume interview" }));
  fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "My exact unsaved words" } });
  fireEvent.click(screen.getByRole("button", { name: "Save & continue" }));
  expect(await screen.findByText(next.question)).toBeVisible();
  expect(screen.queryByText("Saving your interview…")).not.toBeInTheDocument();
  expect(localStorage.getItem(`mn-interview-outbox:${artist}:account`)).toContain("My exact unsaved words");
  expect(screen.getByRole("button", { name: /Your responses/ })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Edit response", hidden: true })).not.toBeInTheDocument();
});

it('keeps an already offered question visible while background preparation is pending', async () => {
  jest.mocked(fetch).mockResolvedValue(reply({ ...active, preparation: { status: 'pending' } }) as Response);
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Resume interview' }));
  expect(screen.getByText(question.question)).toBeVisible();
  expect(screen.queryByText('Preparing your questions…')).not.toBeInTheDocument();
});

it('loads the remaining checked bank on explicit legacy Resume before accepting answers', async () => {
  const next = { ...question, id: '44444444-4444-4444-8444-444444444444', ordinal: 2, question: 'What happened next?' };
  jest.mocked(fetch)
    .mockResolvedValueOnce(reply({ ...active, session: { ...active.session, needsPreparedBankResume: true } }) as Response)
    .mockResolvedValueOnce(reply({ ...active, session: { ...active.session, questions: [question, next] } }) as Response)
    .mockImplementationOnce(() => new Promise(() => {}));
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  await screen.findByRole('button', { name: 'Resume interview' });
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Resume interview' }));
  await screen.findByLabelText('Your answer');
  expect(JSON.parse(jest.mocked(fetch).mock.calls[1][1]?.body as string)).toEqual({ action: 'continue', sessionId: session });
  fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: 'Exact legacy response' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save & continue' }));
  expect(screen.getByText(next.question)).toBeVisible();
  expect(screen.queryByText(/Preparing your questions|Opening your question|Saving your interview/)).not.toBeInTheDocument();
});

it("shows preferences inside the same dialog and preserves the unfinished answer on Back", async () => {
  jest.mocked(fetch).mockResolvedValue(reply(active) as Response);
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(await screen.findByRole("button", { name: "Resume interview" }));
  fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "My unfinished words" } });
  fireEvent.click(screen.getByRole("button", { name: "Topic preferences" }));
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
  expect(screen.getByRole("dialog", { name: "Topic preferences" })).toContainElement(screen.getByRole("button", { name: "Back to interview" }));
  expect(screen.queryByRole("textbox", { name: "Your answer" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Back to interview" }));
  expect(screen.getByRole("textbox", { name: "Your answer" })).toHaveValue("My unfinished words");
});

it("keeps an inline edit across Back and requires Save or Cancel before closing", async () => {
  jest.mocked(fetch).mockResolvedValue(reply({ ...active, session: { ...active.session, questions: [{ ...question, state: "answered", answer: "Saved words" }] } }) as Response);
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(await screen.findByRole("button", { name: "Interview" }));
  fireEvent.click(screen.getByRole("button", { name: /Your responses/ }));
  fireEvent.click(screen.getByRole("button", { name: "Edit response" }));
  fireEvent.change(screen.getByLabelText("Your response"), { target: { value: "Unfinished edit" } });
  fireEvent.click(screen.getByRole("button", { name: "Back to interview" }));
  fireEvent.click(screen.getByRole("button", { name: /Your responses/ }));
  expect(screen.getByLabelText("Your response")).toHaveValue("Unfinished edit");
  fireEvent.click(screen.getByRole("button", { name: "Back to interview" }));
  fireEvent.click(screen.getByRole("button", { name: "Finish interview" }));
  expect(screen.getByLabelText("Your response")).toHaveValue("Unfinished edit");
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.getByRole("dialog", { name: "Your responses" })).toBeVisible();
  expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Your edit is still open" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

it("mounts the editor only after acknowledgement and edits using the confirmed revision", async () => {
  let acknowledge!: (value: Response) => void;
  const confirmed = { ...question, state: "answered", answer: "Original answer", revision: "b".repeat(64) };
  jest.mocked(fetch).mockResolvedValueOnce(reply(active) as Response)
    .mockImplementationOnce(() => new Promise(resolve => { acknowledge = resolve; }))
    .mockResolvedValueOnce(reply({ status: "ok", response: { ...confirmed, answer: "Edited answer", revision: "c".repeat(64), source: null } }) as Response);
  render(<ApiInterview artistId={artist} artistName="Artist" />);
  fireEvent.click(await screen.findByRole("button", { name: "Resume interview" }));
  fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "Original answer" } });
  fireEvent.click(screen.getByRole("button", { name: "Save & continue" }));
  expect(screen.getByRole("button", { name: /Your responses/ })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Edit response", hidden: true })).not.toBeInTheDocument();
  await waitFor(() => expect(acknowledge).toBeDefined());
  await act(async () => acknowledge(reply({ ...active, session: { ...active.session, questions: [confirmed] } }) as Response));
  await waitFor(() => expect(screen.getByRole("button", { name: /Your responses/ })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: /Your responses/ }));
  fireEvent.click(screen.getByRole("button", { name: "Edit response" }));
  fireEvent.change(screen.getByLabelText("Your response"), { target: { value: "Edited answer" } });
  fireEvent.click(screen.getByRole("button", { name: "Save response" }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
  expect(JSON.parse(jest.mocked(fetch).mock.calls[2][1]?.body as string).expectedRevision).toBe(confirmed.revision);
});

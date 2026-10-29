import { render, screen, fireEvent, act } from "@testing-library/react";
import { useChat } from "@ai-sdk/react";
import { getAccessToken } from "@privy-io/react-auth";
jest.mock("@privy-io/react-auth", () => ({ getAccessToken: jest.fn() }));
import IntentExplorer from "../IntentExplorer";
import { canvasSeed } from "@/lib/intent/canvasProtocol";
jest.mock("@/app/_components/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", setTheme: jest.fn() }),
}));
const mockUseChat = useChat as jest.Mock;
beforeEach(() => {
  sessionStorage.clear();
  mockUseChat.mockReturnValue({
    messages: [],
    setMessages: jest.fn(),
    sendMessage: jest.fn(),
    status: "ready",
    stop: jest.fn(),
    error: undefined,
  });
});
it("labels replay honestly and only changes canvas after a successful complete turn", () => {
  render(<IntentExplorer />);
  expect(screen.getByText("Canvas replay · no live AI")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Show me her career" }));
  const options = mockUseChat.mock.calls.at(-1)[0];
  const transport = options.transport as {
    options: {
      prepareSendMessagesRequest: (x: { messages: unknown[] }) => {
        body: { canvas: Record<string, unknown> };
      };
    };
  };
  const request = transport.options.prepareSendMessagesRequest({ messages: [] })
    .body.canvas;
  act(() =>
    options.onData({
      type: "data-canvas",
      data: {
        version: "canvas.v1",
        sessionId: request.sessionId,
        turnId: request.turnId,
        baseRevision: 0,
        revision: 1,
        nextSpec: {
          blocks: [
            {
              id: "career",
              kind: "timeline",
              title: "Career",
              items: ["teen"],
              span: 2,
            },
          ],
        },
        evidence: canvasSeed,
        changes: { added: ["career"], updated: [], removed: [] },
      },
    }),
  );
  expect(
    screen.queryByRole("heading", { name: "Career" }),
  ).not.toBeInTheDocument();
  act(() =>
    options.onFinish({
      isAbort: false,
      isError: false,
      message: { id: "old-cancelled-turn" },
    }),
  );
  expect(
    screen.queryByRole("heading", { name: "Career" }),
  ).not.toBeInTheDocument();
  act(() =>
    options.onFinish({
      isAbort: false,
      isError: false,
      message: { id: request.turnId },
    }),
  );
  expect(screen.getByRole("heading", { name: "Career" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Pin Career" }));
  expect(screen.getByRole("button", { name: "Remove Career" })).toBeDisabled();
});

it("clears invisible selections when a card is removed and restores keyboard focus", () => {
  render(<IntentExplorer />);
  fireEvent.click(screen.getByRole("button", { name: "Select OUT HERE" }));
  expect(
    screen.getByRole("button", { name: "Compare selection" }),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Remove A place to begin" }),
  );
  expect(
    screen.queryByRole("button", { name: "Compare selection" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("textbox", { name: "Explore LATASHÁ" }),
  ).toHaveFocus();
  expect(screen.getByText("0 blocks on your canvas")).toBeInTheDocument();
});

it("ignores a late data packet without discarding the current valid turn", () => {
  render(<IntentExplorer />);
  fireEvent.click(screen.getByRole("button", { name: "Show me her career" }));
  const options = mockUseChat.mock.calls.at(-1)[0];
  const request = options.transport.options.prepareSendMessagesRequest({
    messages: [],
    setMessages: jest.fn(),
  }).body.canvas;
  const update = {
    version: "canvas.v1",
    sessionId: request.sessionId,
    turnId: request.turnId,
    baseRevision: 0,
    revision: 1,
    nextSpec: {
      blocks: [
        {
          id: "current",
          kind: "timeline",
          title: "Current turn",
          items: ["teen"],
          span: 2,
        },
      ],
    },
    evidence: canvasSeed,
    changes: { added: ["current"], updated: [], removed: [] },
  };
  act(() => options.onData({ type: "data-canvas", data: update }));
  act(() =>
    options.onData({
      type: "data-canvas",
      data: { ...update, turnId: "33333333-3333-4333-8333-333333333333" },
    }),
  );
  act(() =>
    options.onFinish({
      isAbort: false,
      isError: false,
      message: { id: request.turnId },
    }),
  );
  expect(
    screen.getByRole("heading", { name: "Current turn" }),
  ).toBeInTheDocument();
});

it("keeps the canvas when stop is followed by late completion", () => {
  const view = render(<IntentExplorer />);
  fireEvent.click(screen.getByRole("button", { name: "Show me her career" }));
  const options = mockUseChat.mock.calls.at(-1)[0];
  const request = options.transport.options.prepareSendMessagesRequest({
    messages: [],
    setMessages: jest.fn(),
  }).body.canvas;
  const result = mockUseChat.mock.results.at(-1)!.value;
  mockUseChat.mockReturnValue({ ...result, status: "streaming" });
  view.rerender(<IntentExplorer />);
  fireEvent.click(screen.getByRole("button", { name: "Stop" }));
  act(() =>
    options.onData({
      type: "data-canvas",
      data: {
        version: "canvas.v1",
        sessionId: request.sessionId,
        turnId: request.turnId,
        baseRevision: 0,
        revision: 1,
        nextSpec: { blocks: [] },
        evidence: [],
        changes: { added: [], updated: [], removed: ["starting-work"] },
      },
    }),
  );
  act(() =>
    options.onFinish({
      isAbort: false,
      isError: false,
      message: { id: request.turnId },
    }),
  );
  expect(
    screen.getByRole("heading", { name: "A place to begin" }),
  ).toBeInTheDocument();
});

it("uses existing anonymous access when the optional login helper throws synchronously", async () => {
  (getAccessToken as jest.Mock).mockImplementation(() => {
    throw new Error("Provider absent");
  });
  render(<IntentExplorer liveApiUrl="https://api.example.com" />);
  const options = mockUseChat.mock.calls.at(-1)[0];
  await expect(options.transport.options.headers()).resolves.toEqual({});
});

it("restores pins and canvas after remount, and reset clears the saved exploration", () => {
  const first = render(<IntentExplorer />);
  fireEvent.click(screen.getByRole("button", { name: "Pin A place to begin" }));
  first.unmount();
  render(<IntentExplorer />);
  expect(
    screen.getByRole("button", { name: "Unpin A place to begin" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Restored this tab’s saved exploration."),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reset exploration" }));
  expect(
    screen.getByRole("button", { name: "Pin A place to begin" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Started a fresh exploration.")).toBeInTheDocument();
});
it("preserves the usable canvas after a malformed composition finishes", () => {
  render(<IntentExplorer />);
  fireEvent.click(screen.getByRole("button", { name: "Show me her career" }));
  const options = mockUseChat.mock.calls.at(-1)[0];
  const request = options.transport.options.prepareSendMessagesRequest({
    messages: [],
  }).body.canvas;
  act(() =>
    options.onData({
      type: "data-canvas",
      data: {
        ...request,
        revision: 1,
        nextSpec: { blocks: [{ kind: "script" }] },
      },
    }),
  );
  act(() =>
    options.onFinish({
      isAbort: false,
      isError: false,
      message: { id: request.turnId },
    }),
  );
  expect(
    screen.getByRole("heading", { name: "A place to begin" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/previous canvas is intact/)).toBeInTheDocument();
});
it("ignores a cancelled artist turn after switching to another artist", () => {
  const onBack = jest.fn();
  const first = render(<IntentExplorer onBack={onBack} />);
  fireEvent.click(screen.getByRole("button", { name: "Show me her career" }));
  const old = mockUseChat.mock.calls.at(-1)[0];
  const request = old.transport.options.prepareSendMessagesRequest({
    messages: [],
  }).body.canvas;
  const stop = mockUseChat.mock.results.at(-1)!.value.stop;
  fireEvent.click(screen.getByRole("button", { name: "Change artist" }));
  expect(stop).toHaveBeenCalled();
  first.unmount();
  render(<IntentExplorer artistId="6cb3d81a-3d02-4c57-a711-bb7902a9af1b" />);
  act(() =>
    old.onData({
      type: "data-canvas",
      data: {
        ...request,
        revision: 1,
        nextSpec: { blocks: [] },
        evidence: [],
        changes: { added: [], updated: [], removed: ["starting-work"] },
      },
    }),
  );
  act(() =>
    old.onFinish({
      isAbort: false,
      isError: false,
      message: { id: request.turnId },
    }),
  );
  expect(screen.getByRole("heading", { name: "Dutchyyy" })).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Junk Planet" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "OUT HERE" }),
  ).not.toBeInTheDocument();
});

it("opens an arbitrary artist with its own identity and no borrowed seed or model request", () => {
  const send = jest.fn();
  mockUseChat.mockReturnValue({
    messages: [],
    setMessages: jest.fn(),
    sendMessage: send,
    status: "ready",
    stop: jest.fn(),
  });
  render(
    <IntentExplorer
      artistId="11111111-1111-4111-8111-111111111111"
      profile={{
        id: "11111111-1111-4111-8111-111111111111",
        name: "Another Artist",
        profileUrl: "/artist/11111111-1111-4111-8111-111111111111?view=profile",
      }}
      initialEvidence={[]}
      coverage="No readable public sources are available yet."
      generationEnabled={false}
      liveApiUrl="https://example.com"
      embedded
    />,
  );
  expect(
    screen.getByRole("heading", { name: "Another Artist" }),
  ).toBeInTheDocument();
  expect(screen.queryByText("OUT HERE")).not.toBeInTheDocument();
  expect(screen.queryByText("Junk Planet")).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Send exploration" }),
  ).toBeDisabled();
  expect(send).not.toHaveBeenCalled();
});
it("restores a failed draft", () => {
  render(<IntentExplorer liveApiUrl="https://example.com" />);
  fireEvent.change(screen.getByLabelText("Explore LATASHÁ"), {
    target: { value: "What changed?" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send exploration" }));
  act(() => mockUseChat.mock.calls.at(-1)[0].onError());
  expect(screen.getByLabelText("Explore LATASHÁ")).toHaveValue("What changed?");
});

it("keeps the mobile canvas visible while conversation history is a dismissible dialog", () => {
  const previous = window.matchMedia;
  window.matchMedia = jest
    .fn()
    .mockReturnValue({
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });
  try {
    mockUseChat.mockReturnValue({
      messages: [
        {
          id: "old",
          role: "user",
          parts: [{ type: "text", text: "A previous question" }],
        },
      ],
      setMessages: jest.fn(),
      sendMessage: jest.fn(),
      status: "ready",
      stop: jest.fn(),
    });
    render(<IntentExplorer />);
    expect(screen.queryByText("A previous question")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Conversation · 1" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("A previous question")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("OUT HERE")).toBeInTheDocument();
  } finally {
    window.matchMedia = previous;
  }
});

it("opens as a sourced first answer with an artist-specific invitation without calling a model", () => {
  render(
    <IntentExplorer
      artistId="11111111-1111-4111-8111-111111111111"
      profile={{
        id: "11111111-1111-4111-8111-111111111111",
        name: "Example Artist",
        profileUrl: "/artist/example?view=profile",
      }}
      initialEvidence={[]}
      introduction={{
        text: "Example Artist makes recorded music.",
        sourceUrl: "https://example.com/profile",
      }}
      openingIds={[]}
      openingQuestion="Want to explore the archive together?"
      openingSuggestions={[
        { label: "Explore the archive", prompt: "Tell me about the archive" },
      ]}
      embedded
    />,
  );
  expect(
    screen.getByText("Example Artist makes recorded music."),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Want to explore the archive together?"),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Explore the archive" }),
  ).toBeInTheDocument();
  expect(
    mockUseChat.mock.results.at(-1)?.value.sendMessage,
  ).not.toHaveBeenCalled();
});

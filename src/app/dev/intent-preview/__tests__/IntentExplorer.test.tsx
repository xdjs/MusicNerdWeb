import { render, screen, fireEvent, act } from "@testing-library/react";
import { useChat } from "@ai-sdk/react";
import IntentExplorer from "../IntentExplorer";
import { canvasSeed } from "@/lib/intent/canvasProtocol";
jest.mock("@/app/_components/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", setTheme: jest.fn() }),
}));
const mockUseChat = useChat as jest.Mock;
beforeEach(() => {
  mockUseChat.mockReturnValue({
    messages: [],
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
  act(() => options.onFinish({ isAbort: false, isError: false }));
  expect(screen.getByRole("heading", { name: "Career" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Pin Career" }));
  expect(screen.getByRole("button", { name: "Remove Career" })).toBeDisabled();
});

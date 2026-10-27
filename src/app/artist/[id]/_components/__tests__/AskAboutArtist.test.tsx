/**
 * The artist chat on `useChat`: what it sends to MusicNerdAPI's streaming chat
 * endpoint and how it renders the streamed parts (text with `[n]` citations,
 * `source-url` parts, tool steps as a status line). `useChat` is mocked
 * (src/test/__mocks__/ai-sdk-react.ts); each test sets the chat's state.
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useChat } from "@ai-sdk/react";
import { getAccessToken } from "@privy-io/react-auth";
import AskAboutArtist from "../AskAboutArtist";
import { musicNerdApiUrl } from "@/lib/musicNerdApi/musicNerdApiUrl";

const chat = jest.mocked(useChat);
const sendMessage = jest.fn();
const stop = jest.fn();
const regenerate = jest.fn();

function state(overrides: Record<string, unknown> = {}) {
    chat.mockReturnValue({ messages: [], status: "ready", error: undefined, sendMessage, stop, regenerate, ...overrides } as never);
}
const user = (text: string, id = "u1") => ({ id, role: "user", parts: [{ type: "text", text }] });
const assistant = (parts: unknown[], id = "a1") => ({ id, role: "assistant", parts });
const source = (n: number, url = `https://example.com/${n}`, title = `Source ${n}`) => ({ type: "source-url", sourceId: String(n), url, title });

function renderChat() {
    return render(<AskAboutArtist artistId="a1" artistName="Pete Rango" />);
}
function transportOptions() {
    // The mocked DefaultChatTransport (src/test/__mocks__/ai.ts) keeps its options.
    const options = chat.mock.calls.at(-1)?.[0] as unknown as { transport: { options: unknown } };
    return options.transport.options as {
        api: string; credentials: string;
        headers: () => Promise<Record<string, string>>;
        prepareSendMessagesRequest: (input: { messages: unknown[]; id: string; trigger: string }) => unknown;
    };
}

beforeEach(() => { jest.clearAllMocks(); state(); });

describe("sending", () => {
    it("sends the question through useChat to the artist's chat endpoint on MusicNerdAPI", () => {
        renderChat();
        fireEvent.change(screen.getByRole("textbox"), { target: { value: "  Who played drums?  " } });
        fireEvent.click(screen.getByRole("button", { name: "Submit question" }));
        expect(sendMessage).toHaveBeenCalledWith({ text: "Who played drums?" });
        expect(screen.getByRole("textbox")).toHaveValue("");
        const options = transportOptions();
        expect(options.api).toBe(musicNerdApiUrl("/api/artist/a1/chat"));
        expect(options.credentials).toBe("omit");
    });

    it("sends the Privy token when signed in and no Authorization header when signed out", async () => {
        renderChat();
        await expect(transportOptions().headers()).resolves.toEqual({ Authorization: "Bearer mock-access-token" });
        jest.mocked(getAccessToken).mockResolvedValueOnce(null as never);
        await expect(transportOptions().headers()).resolves.toEqual({});
        jest.mocked(getAccessToken).mockRejectedValueOnce(new Error("not ready"));
        await expect(transportOptions().headers()).resolves.toEqual({});
    });

    it("sends only the messages, the body the endpoint accepts", () => {
        renderChat();
        const messages = [user("Who played drums?")];
        expect(transportOptions().prepareSendMessagesRequest({ messages, id: "chat", trigger: "submit-message" }))
            .toEqual({ body: { messages } });
    });

    it("sends a suggestion when it is tapped and stops offering it", () => {
        const { rerender } = renderChat();
        fireEvent.click(screen.getByRole("button", { name: "How did Pete Rango get started?" }));
        expect(sendMessage).toHaveBeenCalledWith({ text: "How did Pete Rango get started?" });
        state({ messages: [user("How did Pete Rango get started?"), assistant([{ type: "text", text: "In a garage." }])] });
        rerender(<AskAboutArtist artistId="a1" artistName="Pete Rango" />);
        expect(screen.queryByRole("button", { name: "How did Pete Rango get started?" })).not.toBeInTheDocument();
    });

    it("does not send while an answer is streaming", () => {
        state({ messages: [user("Q")], status: "submitted" });
        renderChat();
        expect(screen.getByRole("button", { name: "Submit question" })).toBeDisabled();
        expect(screen.queryByRole("button", { name: /get started/ })).not.toBeInTheDocument();
    });
});

describe("while the answer streams", () => {
    it("says what the chat is doing, from the latest tool step", () => {
        state({ messages: [user("Q")], status: "submitted" });
        const { rerender } = renderChat();
        expect(screen.getByRole("status")).toHaveTextContent("Checking Lore…");

        state({ status: "streaming", messages: [user("Q"), assistant([
            { type: "tool-searchSources", toolCallId: "t1", state: "output-available", input: { query: "drums" },
                output: { sources: [{ sourceId: "vault:1", title: "Interview on Pitchfork", url: "https://pitchfork.com/a", snippet: "" }] } },
            { type: "tool-readSource", toolCallId: "t2", state: "input-available", input: { sourceId: "vault:1" } },
        ])] });
        rerender(<AskAboutArtist artistId="a1" artistName="Pete Rango" />);
        expect(screen.getByRole("status")).toHaveTextContent("Reading Interview on Pitchfork…");
        expect(screen.getByRole("log")).toHaveAttribute("aria-busy", "true");
    });

    it("shows the text as soon as it arrives", () => {
        state({ status: "streaming", messages: [user("Q"), assistant([source(1), { type: "text", text: "He started in a garage [1" }])] });
        renderChat();
        expect(screen.getByTestId("answer")).toHaveTextContent("He started in a garage [1");
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("stops the stream with stop() and offers to ask again", () => {
        state({ messages: [user("Q")], status: "submitted" });
        const { rerender } = renderChat();
        fireEvent.click(screen.getByRole("button", { name: "Stop" }));
        expect(stop).toHaveBeenCalledTimes(1);

        state({ messages: [user("Q")], status: "ready" });
        rerender(<AskAboutArtist artistId="a1" artistName="Pete Rango" />);
        expect(screen.getByText("Stopped. You can try again when ready.")).toBeVisible();
        fireEvent.click(screen.getByRole("button", { name: "Try again" }));
        expect(regenerate).toHaveBeenCalledTimes(1);
    });
});

describe("an answer, rendered", () => {
    const ANSWER = "Rango co-produced it with Dame Atlas [Artist Doc, 2, 4] and produced for Kilo Kish [10], on [2026-05-13].";
    function answered(parts: unknown[] = [source(2, "https://www.discogs.com/release/1"), source(4, "https://open.spotify.com/album/4Kka"),
        source(10, "https://www.instagram.com/p/ABC/", "Pete Rango on Instagram, 2026-03-23"), source(11)]) {
        state({ messages: [user("Who has Pete Rango worked with?"), assistant([...parts, { type: "text", text: ANSWER }])] });
        renderChat();
        return within(screen.getByTestId("answer"));
    }

    it("turns citation numbers into links to the streamed sources", () => {
        const prose = answered();
        expect(prose.getByRole("link", { name: "2" })).toHaveAttribute("href", "https://www.discogs.com/release/1");
        expect(prose.getByRole("link", { name: "4" })).toHaveAttribute("href", "https://open.spotify.com/album/4Kka");
        expect(prose.getByRole("link", { name: "10" })).toHaveAttribute("target", "_blank");
    });

    it("drops [Artist Doc] and numbers with no source, and leaves dates alone", () => {
        const prose = answered([source(2)]);
        expect(screen.getByTestId("answer").textContent).not.toMatch(/Artist Doc|\[10\]/);
        expect(prose.getAllByRole("link")).toHaveLength(1);
        expect(screen.getByTestId("answer")).toHaveTextContent("[2026-05-13]");
        // The dropped marker takes the space before it, so no " ," is left behind.
        expect(screen.getByTestId("answer").textContent).toContain("Kilo Kish, on");
    });

    it("lists the cited sources only, dated when they are posts on one site", () => {
        answered();
        const pills = screen.getAllByRole("link").filter(a => !within(screen.getByTestId("answer")).queryAllByRole("link").includes(a));
        expect(pills.map(a => a.textContent)).toEqual(["[2]discogs.com", "[4]open.spotify.com", "[10]instagram.com · Mar 2026"]);
        expect(screen.getByText("Written by AI from the sources above")).toBeVisible();
    });

    const webSearch = (urls: string[]) => ({ type: "tool-webSearch", toolCallId: "w", state: "output-available", input: { query: "q" },
        output: { results: urls.map((url, i) => ({ n: i + 1, title: url, url, snippet: "" })) } });

    it("says an answer came from a web search when its sources did", () => {
        state({ messages: [user("Q"), assistant([webSearch(["https://web.example/1"]), source(1, "https://web.example/1"),
            { type: "text", text: "On the web [1]." }])] });
        renderChat();
        expect(screen.getByText("Written by AI from a web search")).toBeVisible();
    });

    it("says a web search was among the sources when it was one of several", () => {
        state({ messages: [user("Q"), assistant([source(1), webSearch(["https://web.example/2"]), source(2, "https://web.example/2"),
            { type: "text", text: "Saved [1] and web [2]." }])] });
        renderChat();
        expect(screen.getByText("Written by AI from the sources above, including a web search")).toBeVisible();
    });

    it("does not credit a web search that found nothing", () => {
        state({ messages: [user("Q"), assistant([webSearch([]), { type: "text", text: "I couldn't find that." }])] });
        renderChat();
        expect(screen.getByText("AI-generated response")).toBeVisible();
        expect(screen.queryByText(/web search/)).not.toBeInTheDocument();
    });

    it("shows an error with an explicit retry", () => {
        state({ messages: [user("Q")], status: "error", error: Object.assign(new Error('{"status":"error","error":"Unknown artist"}'), { statusCode: 404 }) });
        renderChat();
        expect(screen.getByRole("alert")).toHaveTextContent("Failed to get an answer. Try again.");
        fireEvent.click(screen.getByRole("button", { name: "Try again" }));
        expect(regenerate).toHaveBeenCalledTimes(1);
    });
});

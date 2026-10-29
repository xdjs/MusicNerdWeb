"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { getAccessToken } from "@privy-io/react-auth";
import { DefaultChatTransport } from "ai";
import { ArrowLeft, ArrowUpRight, AudioLines, Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/_components/ThemeProvider";
import {
  CANVAS_ARTIST_ID,
  canvasSeed,
  canvasSeeds,
  DUTCH_ARTIST_ID,
  type CanvasRequest,
  type CanvasUpdate,
  type CanvasSpec,
} from "@/lib/intent/canvasProtocol";
import { createReplayResponse } from "@/lib/intent/createReplayResponse";
import { getCanvasError } from "@/lib/intent/getCanvasError";
import { applyCanvasUpdate } from "@/lib/intent/applyCanvasUpdate";
import { profileUrl } from "@/lib/intent/latashaSnapshot";
import CanvasBlock from "./CanvasBlock";
import CanvasMessage from "./CanvasMessage";
import SourceNote from "./SourceNote";
import styles from "./intent.module.css";
const steps = [
  "Show me her career",
  "Focus on independence",
  "What was she releasing then?",
  "Add her visual work",
  "Keep the timeline, compare two releases and remove videos",
];
export default function IntentExplorer({
  liveApiUrl,
  artistId = CANVAS_ARTIST_ID,
  initialIntent,
  onBack,
}: {
  liveApiUrl?: string;
  artistId?: string;
  initialIntent?: string;
  onBack?: () => void;
}) {
  const dutch = artistId === DUTCH_ARTIST_ID;
  const artistName = dutch ? "Dutchyyy" : "LATASHÁ";
  const artistProfile = dutch
    ? "https://musicnerd.net/artist/efff5473-fa9f-4eba-b137-16ffb79f15d8"
    : profileUrl;
  const artistSeed = canvasSeeds[artistId];
  const conversationSteps = dutch
    ? [
        "Explore his archive",
        "Focus on improvisation",
        "Show his early releases",
        "Compare my selection",
      ]
    : steps;
  const { theme, setTheme } = useTheme();
  const [input, setInput] = useState(initialIntent ?? "");
  const [state, setState] = useState<{
    spec: CanvasSpec;
    revision: number;
    evidence: typeof canvasSeed;
  }>({
    spec: {
      blocks: [
        {
          id: "starting-work",
          kind: dutch ? "document" : "cards",
          title: "A place to begin",
          items: [dutch ? "dutch-junk" : "out"],
          span: 1,
        },
      ],
    },
    revision: 0,
    evidence: artistSeed,
  });
  const [pinned, setPinned] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [focus, setFocus] = useState<string | null>(null);
  const [history, setHistory] = useState<(typeof state)[]>([]);
  const [notice, setNotice] = useState("");
  const conversationElement = useRef<HTMLDivElement>(null);
  const inputElement = useRef<HTMLInputElement>(null);
  const session = useRef<string | null>(null);
  const pending = useRef<CanvasRequest | null>(null);
  const staged = useRef<CanvasUpdate | null>(null);
  const latest = useRef(state);
  latest.current = state;
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: liveApiUrl
          ? `${liveApiUrl}/api/artist/${artistId}/chat`
          : "/replay-only",
        fetch: async (url, options) =>
          liveApiUrl
            ? fetch(url, options)
            : createReplayResponse(JSON.parse(String(options?.body)), artistId),
        credentials: "omit",
        headers: async (): Promise<Record<string, string>> => {
          if (!liveApiUrl) return {};
          const token = await getAccessToken().catch(() => null);
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        prepareSendMessagesRequest: ({ messages }) => ({
          body: { messages, canvas: pending.current },
        }),
      }),
    [liveApiUrl, artistId],
  );
  const { messages, sendMessage, status, stop, error } = useChat({
    transport,
    onData: (part) => {
      if (part.type === "data-canvas" && pending.current) {
        try {
          staged.current = applyCanvasUpdate(part.data, pending.current);
        } catch {
          staged.current = null;
          setNotice(
            "The response did not match this canvas. Your previous canvas is intact.",
          );
        }
      }
    },
    onFinish: ({ isAbort, isError, message }) => {
      const update = staged.current;
      const request = pending.current;
      if (message && request && message.id !== request.turnId) return;
      if (
        !isAbort &&
        !isError &&
        update &&
        request &&
        latest.current.revision === request.baseRevision
      ) {
        setHistory((previous) => [...previous, latest.current]);
        setState({
          spec: update.nextSpec,
          revision: update.revision,
          evidence: update.evidence,
        });
        const visible = new Set(
          update.nextSpec.blocks.flatMap((block) => block.items),
        );
        setSelected((ids) => ids.filter((id) => visible.has(id)));
        setExpanded((ids) =>
          ids.filter((id) =>
            update.nextSpec.blocks.some((block) => block.id === id),
          ),
        );
        setFocus((id) =>
          update.nextSpec.blocks.some((block) => block.id === id) ? id : null,
        );
        setNotice(
          `${update.changes.added.length} added · ${update.changes.updated.length} updated · ${update.changes.removed.length} removed`,
        );
      } else if (!isAbort && !isError && request) {
        setNotice(
          "No valid canvas update was produced. Your previous canvas is intact; try a smaller refinement.",
        );
      }
      staged.current = null;
      pending.current = null;
    },
    onError: () => {
      staged.current = null;
      pending.current = null;
    },
  });
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => {
    if (busy && conversationElement.current)
      conversationElement.current.scrollTop =
        conversationElement.current.scrollHeight;
  }, [messages, busy]);
  function ask(question: string) {
    if (busy || !question.trim()) return;
    session.current ??= crypto.randomUUID();
    pending.current = {
      version: "canvas.v1",
      sessionId: session.current,
      turnId: crypto.randomUUID(),
      baseRevision: state.revision,
      spec: state.spec,
      pinnedIds: pinned,
      selectedIds: selected,
      focusId: focus,
    };
    staged.current = null;
    setInput("");
    setNotice("");
    void sendMessage({ text: question });
  }
  const initialSent = useRef(false);
  useEffect(() => {
    if (liveApiUrl && initialIntent && !initialSent.current) {
      initialSent.current = true;
      ask(initialIntent);
    }
  });
  function remove(id: string) {
    if (pinned.includes(id) || busy) return;
    const remaining = state.spec.blocks.filter((block) => block.id !== id);
    const visible = new Set(remaining.flatMap((block) => block.items));
    setSelected((ids) => ids.filter((selectedId) => visible.has(selectedId)));
    setExpanded((ids) => ids.filter((expandedId) => expandedId !== id));
    inputElement.current?.focus();
    setHistory((previous) => [...previous, state]);
    setState({
      ...state,
      revision: state.revision + 1,
      spec: { blocks: state.spec.blocks.filter((b) => b.id !== id) },
    });
    if (focus === id) setFocus(null);
  }
  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setState({ ...previous, revision: state.revision + 1 });
    setHistory((h) => h.slice(0, -1));
    setPinned((ids) =>
      ids.filter((id) => previous.spec.blocks.some((b) => b.id === id)),
    );
    setSelected([]);
    setNotice("Restored the previous canvas.");
  }
  const toggle = (values: string[], id: string) =>
    values.includes(id)
      ? values.filter((value) => value !== id)
      : [...values, id];
  const suggested =
    state.revision === 0
      ? dutch
        ? conversationSteps.slice(0, 3)
        : [steps[0], steps[1], steps[3]]
      : state.spec.blocks.some((b) => b.id === "voice")
        ? conversationSteps.slice(2)
        : conversationSteps.slice(1, 4);
  return (
    <div className={styles.experiment}>
      <header className={styles.topbar}>
        <a href={artistProfile} className={styles.brand}>
          <img src="/musicNerdLogo.png" alt="Music Nerd" />
          <span>
            Music Nerd<small>Follow your curiosity</small>
          </span>
        </a>
        <div className={styles.headerActions}>
          {onBack && (
            <button
              onClick={() => {
                void stop();
                onBack();
              }}
            >
              Change artist
            </button>
          )}
          <span className={styles.previewBadge}>
            {liveApiUrl
              ? "Live composition · Music Nerd chat"
              : "Canvas replay · no live AI"}
          </span>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>
      <div className={styles.layout}>
        <aside className={styles.identity}>
          <div className={styles.portrait}>
            <img
              src={`/demo/${dutch ? "dutchyyy" : "latasha"}/portrait.jpg`}
              alt={artistName}
            />
            <div className={styles.portraitCaption}>
              {dutch
                ? "Music. Process. A living archive."
                : "Rapper. Artist. World-builder."}
            </div>
          </div>
          <div className={styles.artistInfo}>
            <h1>{artistName}</h1>
            <p>
              {dutch ? (
                "Follow the work across aliases, releases and an artist’s archive."
              ) : (
                <>
                  New York roots. <br />
                  Los Angeles worlds.
                </>
              )}
            </p>
            <a href={artistProfile} target="_blank" rel="noreferrer">
              Music Nerd profile <ArrowUpRight size={16} />
            </a>
            {!dutch && <SourceNote id="bio" />}
          </div>
          <div className={styles.identityNote}>
            <AudioLines size={22} />
            <p>
              A conversation.
              <br />
              An evolving canvas.
            </p>
          </div>
        </aside>
        <section className={styles.workspace} aria-label="Artist exploration">
          <div className={styles.discussion}>
            {state.revision === 0 && (
              <div className={styles.welcome}>
                <p className={styles.context}>Start with the work</p>
                <h2>
                  {dutch
                    ? "An artist’s archive, opened up."
                    : "Sound. Vision. Independence."}
                </h2>
                <p className={styles.lede}>
                  {dutch
                    ? "Explore the public Lore PDFs, recordings and the stories behind them. Every passage keeps its source close."
                    : "Follow the releases, visual work and artist-first perspective in LATASHÁ’s public sources."}
                </p>
              </div>
            )}
            <div
              className={styles.conversation}
              aria-label="Conversation"
              tabIndex={0}
              ref={conversationElement}
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? styles.userTurn
                      : styles.assistantTurn
                  }
                >
                  <span>
                    {message.role === "user"
                      ? "You"
                      : liveApiUrl
                        ? "Music Nerd"
                        : "Music Nerd · replay"}
                  </span>
                  <CanvasMessage message={message} />
                </div>
              ))}
            </div>
            <form
              className={styles.composer}
              onSubmit={(event) => {
                event.preventDefault();
                ask(input);
              }}
            >
              <label htmlFor="artist-intent" className={styles.srOnly}>
                Explore {artistName}
              </label>
              <input
                id="artist-intent"
                ref={inputElement}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Where does your curiosity go next?"
                maxLength={500}
                disabled={busy}
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send exploration"
              >
                <ArrowUpRight size={25} />
              </button>
            </form>
            <div
              className={styles.suggestions}
              aria-label={
                liveApiUrl
                  ? "Suggested explorations"
                  : "Replay conversation steps"
              }
            >
              {suggested
                .filter(
                  (prompt) =>
                    prompt !== "Compare my selection" || selected.length === 2,
                )
                .map((prompt) => (
                  <button
                    disabled={busy}
                    key={prompt}
                    onClick={() => ask(prompt)}
                  >
                    {prompt}
                    <ArrowUpRight size={14} />
                  </button>
                ))}
            </div>
            <p className={styles.replayNotice}>
              {liveApiUrl
                ? "Ask a follow-up or select evidence. Your canvas evolves with the conversation."
                : "Guided replay: these prompts exercise the real canvas protocol. Free-form model planning is not enabled."}
            </p>
            {busy && (
              <div role="status" className={styles.status}>
                Composing the next canvas…{" "}
                <button
                  onClick={() => {
                    stop();
                    staged.current = null;
                    pending.current = null;
                  }}
                >
                  Stop
                </button>
              </div>
            )}
            {error && (
              <p role="alert" className={styles.error}>
                {getCanvasError(error)} Your last valid canvas is unchanged.
              </p>
            )}
          </div>
          <div className={styles.canvasPanel}>
            <div className={styles.canvasToolbar}>
              <p role="status">
                {notice || `${state.spec.blocks.length} blocks on your canvas`}
              </p>
              <button disabled={busy || !history.length} onClick={undo}>
                <ArrowLeft size={14} /> Undo canvas change
              </button>
            </div>
            {selected.length > 0 && (
              <div className={styles.selectionBar}>
                <span>
                  {selected
                    .map(
                      (id) =>
                        state.evidence.find((item) => item.id === id)?.title ??
                        id,
                    )
                    .join(" + ")}
                </span>
                <button
                  disabled={busy || selected.length !== 2}
                  onClick={() => ask("Compare my selection")}
                >
                  Compare selection
                </button>
                <button disabled={busy} onClick={() => setSelected([])}>
                  Clear
                </button>
              </div>
            )}
            <div
              className={styles.composition}
              aria-label="Persistent exploration canvas"
              aria-busy={busy}
            >
              {!state.spec.blocks.length && (
                <p className={styles.emptyCanvas}>
                  Your canvas is clear. Ask a question to build another view, or
                  undo the last change.
                </p>
              )}
              {state.spec.blocks.map((block) => (
                <CanvasBlock
                  key={block.id}
                  block={block}
                  evidence={state.evidence}
                  busy={busy}
                  pinned={pinned.includes(block.id)}
                  expanded={expanded.includes(block.id)}
                  selected={selected}
                  onPin={() => setPinned(toggle(pinned, block.id))}
                  onExpand={() => setExpanded(toggle(expanded, block.id))}
                  onRemove={() => remove(block.id)}
                  onSelect={(id) => setSelected(toggle(selected, id).slice(-8))}
                  onFocus={() => setFocus(block.id)}
                />
              ))}
            </div>
            <footer className={styles.disclosure}>
              <p>
                Public source snapshot · October 29, 2026. Artist facts stay
                separate from presentation.
              </p>
              <details>
                <summary>What is live in this experiment?</summary>
                <p>
                  {liveApiUrl
                    ? "This preview uses Music Nerd’s existing chat backend to compose evidence-backed blocks. Source snapshot entries are labeled and additional stored sources are retrieved by the chat. Model choices can still be mistaken; inspect evidence."
                    : "The canvas, selection, pinning, undo, revision validation and streamed message handling work. Responses are authored replay fixtures, not model output. The isolated API extension reuses Music Nerd’s chat model and retrieval, but live execution remains disabled."}{" "}
                  Conversations exist only in this tab and reset on reload.
                </p>
                {!dutch && <SourceNote id="profile" />}
              </details>
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
}

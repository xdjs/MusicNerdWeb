"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { getAccessToken } from "@privy-io/react-auth";
import { DefaultChatTransport } from "ai";
import { ArrowLeft, ArrowUpRight, AudioLines, Moon, Sun } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTheme } from "@/app/_components/ThemeProvider";
import {
  CANVAS_ARTIST_ID,
  canvasSeed,
  canvasSeeds,
  DUTCH_ARTIST_ID,
  type CanvasRequest,
  type CanvasUpdate,
  type CanvasSpec,
  type CanvasEvidence,
} from "@/lib/intent/canvasProtocol";
import { createReplayResponse } from "@/lib/intent/createReplayResponse";
import { readCanvasSession } from "@/lib/intent/canvasSession";
import { getMessageText } from "@/lib/artistChat/getMessageText";
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
  profile,
  initialEvidence,
  coverage,
  generationEnabled = true,
  embedded = false,
  introduction,
  openingIds,
  openingQuestion,
  openingSuggestions = [],
}: {
  liveApiUrl?: string;
  artistId?: string;
  initialIntent?: string;
  onBack?: () => void;
  profile?: { id: string; name: string; profileUrl: string };
  initialEvidence?: CanvasEvidence[];
  coverage?: string;
  generationEnabled?: boolean;
  embedded?: boolean;
  introduction?: { text: string; sourceUrl: string } | null;
  openingIds?: string[];
  openingQuestion?: string;
  openingSuggestions?: { label: string; prompt: string }[];
}) {
  const dutch = artistId === DUTCH_ARTIST_ID;
  const knownArtist = dutch || artistId === CANVAS_ARTIST_ID;
  const artistName = profile?.name ?? (dutch ? "Dutchyyy" : "LATASHÁ");
  const artistProfile =
    profile?.profileUrl ??
    (dutch
      ? "https://musicnerd.net/artist/efff5473-fa9f-4eba-b137-16ffb79f15d8"
      : profileUrl);
  const artistSeed = initialEvidence ?? canvasSeeds[artistId] ?? [];
  const conversationSteps = !knownArtist
    ? [
        "Explore these sources",
        "Show a timeline with supported dates",
        "Find a listening starting point",
        "Compare my selection",
      ]
    : dutch
      ? [
          "Explore his archive",
          "Focus on improvisation",
          "Show his early releases",
          "Compare my selection",
        ]
      : steps;
  const { theme, setTheme } = useTheme();
  const [mobile, setMobile] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () =>
      setKeyboardOffset(
        Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop),
      );
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [changedBlocks, setChangedBlocks] = useState<string[]>([]);
  const canvasElement = useRef<HTMLDivElement>(null);
  const lastDraft = useRef("");
  const inspectedWhileBusy = useRef(false);
  const revealAfterCommit = useRef(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1000px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const [input, setInput] = useState(initialIntent ?? "");
  const [state, setState] = useState<{
    spec: CanvasSpec;
    revision: number;
    evidence: typeof canvasSeed;
  }>({
    spec: {
      blocks: artistSeed.length
        ? [
            {
              id: "starting-work",
              kind: profile ? "cards" : dutch ? "document" : "cards",
              title: "A place to begin",
              items:
                openingIds ??
                (knownArtist
                  ? [dutch ? "dutch-junk" : "out"]
                  : artistSeed.slice(0, 3).map((item) => item.id)),
              span: 1,
            },
          ]
        : [],
    },
    revision: 0,
    evidence: artistSeed,
  });
  const initialState = useRef(state);
  const [restored, setRestored] = useState(false);
  const storageKey = `musicnerd-canvas-v2:${liveApiUrl ? "live" : "replay"}:${artistId}`;
  const [pinned, setPinned] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [focus, setFocus] = useState<string | null>(null);
  const [history, setHistory] = useState<(typeof state)[]>([]);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const conversationElement = useRef<HTMLDivElement>(null);
  const inputElement = useRef<HTMLInputElement>(null);
  const session = useRef<string | null>(null);
  const pending = useRef<CanvasRequest | null>(null);
  const staged = useRef<CanvasUpdate | null>(null);
  const latest = useRef(state);
  latest.current = state;
  const viewChanges = useCallback(() => {
    const target = canvasElement.current?.querySelector<HTMLElement>(
      `[data-canvas-block="${changedBlocks[0] ?? state.spec.blocks[0]?.id}"]`,
    );
    if (!target) return;
    inputElement.current?.blur();
    target.scrollIntoView({ block: "start", behavior: "auto" });
    target.focus({ preventScroll: true });
    setChangedBlocks([]);
  }, [changedBlocks, state.spec]);

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
          try {
            const token = await getAccessToken();
            return token ? { Authorization: `Bearer ${token}` } : {};
          } catch {
            // This existing public endpoint also supports anonymous visitors.
            return {};
          }
        },
        prepareSendMessagesRequest: ({ messages }) => ({
          body: { messages, canvas: pending.current },
        }),
      }),
    [liveApiUrl, artistId],
  );
  const { messages, setMessages, sendMessage, status, stop, error } = useChat({
    transport,
    onData: (part) => {
      if (part.type === "data-canvas" && pending.current) {
        // A cancelled turn may drain after a newer turn has staged its update.
        // Ignore that packet instead of clearing the current valid candidate.
        const packet = part.data;
        if (
          packet &&
          typeof packet === "object" &&
          "turnId" in packet &&
          packet.turnId !== pending.current.turnId
        )
          return;
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
        if (update.explanation)
          setExplanations((previous) => ({
            ...previous,
            [request.turnId]: update.explanation!,
          }));
        setChangedBlocks([...update.changes.added, ...update.changes.updated]);
        revealAfterCommit.current =
          request.baseRevision === 0 && !inspectedWhileBusy.current;
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
        setInput(lastDraft.current);
        setNotice(
          "No valid canvas update was produced. Your previous canvas is intact; try a smaller refinement.",
        );
      }
      staged.current = null;
      pending.current = null;
    },
    onError: () => {
      setInput(lastDraft.current);
      staged.current = null;
      pending.current = null;
    },
  });
  useEffect(() => {
    if (mobile && revealAfterCommit.current) {
      revealAfterCommit.current = false;
      viewChanges();
    }
  }, [state.revision, mobile, viewChanges]);
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => {
    try {
      const saved = readCanvasSession(
        sessionStorage.getItem(storageKey),
        artistId,
      );
      if (saved) {
        setState(saved.state);
        setPinned(saved.pinned);
        setSelected(saved.selected);
        setExpanded(saved.expanded);
        setExplanations(saved.explanations);
        setMessages(saved.messages);
        session.current = saved.sessionId;
        setNotice("Restored this tab’s saved exploration.");
      }
    } catch {
      /* Storage may be unavailable; exploration still works. */
    }
    setRestored(true);
  }, [artistId, storageKey, setMessages]);
  useEffect(() => {
    if (!restored || busy) return;
    try {
      const value = {
        version: 2,
        artistId,
        sessionId: session.current,
        state,
        pinned,
        selected,
        expanded,
        explanations,
        messages: messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-60)
          .map((m) => ({
            id: m.id,
            role: m.role,
            parts: [
              ...m.parts.filter((p) => p.type === "source-url"),
              { type: "text", text: explanations[m.id] ?? getMessageText(m) },
            ],
          })),
      };
      const raw = JSON.stringify(value);
      if (raw.length <= 250000) sessionStorage.setItem(storageKey, raw);
    } catch {
      /* No persistence when storage is unavailable. */
    }
  }, [
    restored,
    busy,
    state,
    pinned,
    selected,
    expanded,
    explanations,
    messages,
    artistId,
    storageKey,
  ]);
  function resetExploration() {
    if (busy) return;
    session.current = null;
    pending.current = null;
    staged.current = null;
    setState(initialState.current);
    setPinned([]);
    setSelected([]);
    setExpanded([]);
    setFocus(null);
    setHistory([]);
    setExplanations({});
    setMessages([]);
    setInput("");
    setNotice("Started a fresh exploration.");
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* Unavailable storage. */
    }
  }

  useEffect(() => {
    if (busy && conversationElement.current)
      conversationElement.current.scrollTop =
        conversationElement.current.scrollHeight;
  }, [messages, busy]);
  function ask(question: string) {
    if (busy || !question.trim() || !generationEnabled) return;
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
    lastDraft.current = question;
    inspectedWhileBusy.current = false;
    setInput("");
    setNotice("");
    void sendMessage({ text: question });
  }
  const initialSent = useRef(false);
  useEffect(() => {
    if (restored && liveApiUrl && initialIntent && !initialSent.current) {
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
      ? !knownArtist
        ? conversationSteps.slice(0, 3)
        : dutch
          ? conversationSteps.slice(0, 3)
          : [steps[0], steps[1], steps[3]]
      : state.spec.blocks.some((b) => b.id === "voice")
        ? conversationSteps.slice(2)
        : conversationSteps.slice(1, 4);
  return (
    <div className={`${styles.experiment} ${embedded ? styles.embedded : ""}`}>
      {!embedded && (
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
      )}
      <div className={styles.layout}>
        <aside className={styles.identity}>
          <div className={styles.portrait}>
            {knownArtist ? (
              <img
                src={`/demo/${dutch ? "dutchyyy" : "latasha"}/portrait.jpg`}
                alt={artistName}
              />
            ) : (
              <span aria-hidden="true" className={styles.artistInitial}>
                {artistName.slice(0, 1)}
              </span>
            )}
            <div className={styles.portraitCaption}>
              {!knownArtist
                ? "Artist exploration"
                : dutch
                  ? "Music. Process. A living archive."
                  : "Rapper. Artist. World-builder."}
            </div>
          </div>
          <div className={styles.artistInfo}>
            <h1>{artistName}</h1>
            <p>
              {!knownArtist ? (
                coverage
              ) : dutch ? (
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
            {artistId === CANVAS_ARTIST_ID && <SourceNote id="bio" />}
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
          <div
            className={styles.discussion}
            style={mobile ? { bottom: keyboardOffset } : undefined}
          >
            {state.revision === 0 && !profile && (
              <div className={styles.welcome}>
                <p className={styles.context}>Start with the work</p>
                <h2>
                  {!knownArtist
                    ? "Explore the saved sources"
                    : dutch
                      ? "An artist’s archive, opened up."
                      : "Sound. Vision. Independence."}
                </h2>
                <p className={styles.lede}>
                  {!knownArtist
                    ? coverage
                    : dutch
                      ? "Explore the public Lore PDFs, recordings and the stories behind them. Every passage keeps its source close."
                      : "Follow the releases, visual work and artist-first perspective in LATASHÁ’s public sources."}
                </p>
              </div>
            )}
            {!mobile && (
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
                    <CanvasMessage
                      message={message}
                      explanation={explanations[message.id]}
                    />
                  </div>
                ))}
              </div>
            )}
            {mobile && (
              <div className={styles.mobileControls}>
                <button onClick={() => setHistoryOpen(true)}>
                  Conversation{messages.length ? ` · ${messages.length}` : ""}
                </button>
                {changedBlocks.length > 0 && (
                  <button onClick={viewChanges}>
                    Updated {changedBlocks.length} cards · View changes
                  </button>
                )}
              </div>
            )}
            <Dialog open={mobile && historyOpen} onOpenChange={setHistoryOpen}>
              <DialogContent className={styles.historySheet}>
                <DialogHeader>
                  <DialogTitle>Conversation with Music Nerd</DialogTitle>
                  <DialogDescription>
                    Your questions and answers. Close to return to the same
                    place in the artist canvas.
                  </DialogDescription>
                </DialogHeader>
                <div className={styles.sheetMessages}>
                  {messages.length ? (
                    messages.map((message) => (
                      <div key={message.id}>
                        <strong>
                          {message.role === "user" ? "You" : "Music Nerd"}
                        </strong>
                        <CanvasMessage
                          message={message}
                          explanation={explanations[message.id]}
                        />
                      </div>
                    ))
                  ) : (
                    <p>Your exploration conversation will appear here.</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
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
                placeholder={`Ask me about ${artistName}…`}
                maxLength={500}
                disabled={busy || !generationEnabled}
              />
              <button
                type="submit"
                disabled={busy || !input.trim() || !generationEnabled}
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
              {(generationEnabled ? suggested : [])
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
            {!generationEnabled && (
              <p role="status">
                You can browse this artist’s saved sources. Live generation for
                additional artists is not enabled in this preview yet.
              </p>
            )}
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
          <div
            className={styles.canvasPanel}
            ref={canvasElement}
            onFocusCapture={() => {
              if (busy) inspectedWhileBusy.current = true;
            }}
            onPointerDown={() => {
              if (busy) inspectedWhileBusy.current = true;
            }}
          >
            {profile && state.revision === 0 && (
              <div className={styles.openingAnswer}>
                <p className={styles.context}>Music Nerd</p>
                <h2>Let’s get to know {artistName}.</h2>
                {introduction ? (
                  <>
                    <p>{introduction.text}</p>
                    <a href={introduction.sourceUrl}>
                      From the artist’s Music Nerd profile ↗
                    </a>
                  </>
                ) : (
                  <p>
                    {artistSeed.length
                      ? `Here are a few starting points from ${artistName}’s saved sources. We can follow whichever catches your ear.`
                      : coverage}
                  </p>
                )}
              </div>
            )}
            <div className={styles.canvasToolbar}>
              <p role="status">
                {notice || `${state.spec.blocks.length} blocks on your canvas`}
              </p>
              <button disabled={busy || !history.length} onClick={undo}>
                <ArrowLeft size={14} /> Undo canvas change
              </button>
              <button disabled={busy} onClick={resetExploration}>
                Reset exploration
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
            {profile && state.revision === 0 && (
              <div className={styles.openingFollowUp}>
                <p>{openingQuestion}</p>
                {openingSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.prompt}
                    disabled={busy}
                    onClick={() => ask(suggestion.prompt)}
                  >
                    {suggestion.label} <ArrowUpRight size={14} />
                  </button>
                ))}
              </div>
            )}
            <footer className={styles.disclosure}>
              <p>
                Sources stay close to the story. Open any card to see where it
                came from.
              </p>
              <details>
                <summary>What is live in this experiment?</summary>
                <p>
                  {liveApiUrl
                    ? "This preview uses Music Nerd’s existing chat backend to compose source-backed blocks. Starting entries use existing public profile data and saved sources; questions can retrieve other stored public sources and pages from two published Dutchyyy PDFs. PDF passages retain physical page links and document attribution. Model choices can still be mistaken; inspect evidence."
                    : "The canvas, selection, pinning, undo, revision validation and streamed message handling work. Responses are authored replay fixtures, not model output. The isolated API extension reuses Music Nerd’s chat model and retrieval, but live execution remains disabled."}{" "}
                  This tab saves its exploration across reloads. Reset
                  exploration clears it. Closing the tab ends this session;
                  nothing is saved to your artist profile.
                </p>
                {artistId === CANVAS_ARTIST_ID && <SourceNote id="profile" />}
              </details>
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
}

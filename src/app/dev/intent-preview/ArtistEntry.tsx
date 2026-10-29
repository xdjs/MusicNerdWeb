"use client";
import { useEffect, useState } from "react";
import { CANVAS_ARTIST_ID, DUTCH_ARTIST_ID } from "@/lib/intent/canvasProtocol";
import IntentExplorer from "./IntentExplorer";
import { parseArtistEntry } from "./parseArtistEntry";
import styles from "./intent.module.css";
const artists = [
  {
    id: CANVAS_ARTIST_ID,
    name: "LATASHÁ",
    image: "latasha",
    description: "Music, visual worlds, and creative independence.",
    prompt: "How do her music and visual worlds connect?",
  },
  {
    id: DUTCH_ARTIST_ID,
    name: "Dutchyyy",
    image: "dutchyyy",
    description: "A life in music, documented in the artist’s archive.",
    prompt: "Help me understand his approach to improvisation.",
  },
];
export default function ArtistEntry({ liveApiUrl }: { liveApiUrl?: string }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{
    id: string;
    intent?: string;
  } | null>(null);
  useEffect(() => {
    try {
      const id = sessionStorage.getItem("musicnerd-canvas-active-v2");
      if (artists.some((a) => a.id === id)) setSelected({ id: id! });
    } catch {
      /* Session storage unavailable. */
    }
  }, []);
  useEffect(() => {
    if (selected)
      try {
        sessionStorage.setItem("musicnerd-canvas-active-v2", selected.id);
      } catch {
        /* Session storage unavailable. */
      }
  }, [selected]);
  if (selected)
    return (
      <IntentExplorer
        key={selected.id}
        artistId={selected.id}
        initialIntent={selected.intent}
        liveApiUrl={liveApiUrl}
        onBack={() => {
          setSelected(null);
          try {
            sessionStorage.removeItem("musicnerd-canvas-active-v2");
          } catch {
            /* Session storage unavailable. */
          }
        }}
      />
    );
  const parsed = parseArtistEntry(
    query,
    artists.map((artist) => artist.name),
  );
  const matches = artists.filter((artist) => parsed.matches.includes(artist.name));
  return (
    <main className={styles.experiment}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <img src="/musicNerdLogo.png" alt="Music Nerd" />
          <span>
            Music Nerd<small>Follow your curiosity</small>
          </span>
        </div>
        <span className={styles.previewBadge}>
          Artist exploration · experiment
        </span>
      </header>
      <div className={styles.entry}>
        <p className={styles.context}>Start with an artist. Follow an idea.</p>
        <h1>
          What draws you
          <br />
          into their world?
        </h1>
        <p>
          Find an artist, or bring a question. Music Nerd shapes a workspace
          around what you want to explore.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (matches.length === 1)
              setSelected({ id: matches[0].id, intent: parsed.intent });
          }}
        >
          <label htmlFor="artist-search">Artist or question</label>
          <input
            id="artist-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Dutchyyy’s approach to improvisation…"
          />
          <button type="submit" disabled={matches.length !== 1}>
            Explore ↗
          </button>
        </form>
        <p className={styles.date}>
          This preview explores two artists using public Music Nerd sources.
          Other artists aren’t connected yet.
        </p>
        <div className={styles.artistChoices}>
          {matches.map((a) => (
            <button
              key={a.id}
              onClick={() =>
                setSelected({ id: a.id, intent: parsed.intent })
              }
            >
              <img src={`/demo/${a.image}/portrait.jpg`} alt="" />
              <div>
                <h2>{a.name}</h2>
                <p>{a.description}</p>
                <span>Explore the artist ↗</span>
              </div>
            </button>
          ))}
        </div>
        {query.trim() && matches.length > 1 && (
          <p role="status">
            Choose an artist below to start. This preview explores one artist at a time.
          </p>
        )}
        {!matches.length && (
          <p role="status">
            No connected artist matches yet. Try LATASHA or Dutchyyy.
          </p>
        )}
      </div>
    </main>
  );
}

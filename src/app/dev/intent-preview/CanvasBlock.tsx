import { getReadableCanvasText } from "@/lib/intent/getReadableCanvasText";
import { formatCanvasDate } from "@/lib/intent/formatCanvasDate";
import { useState } from "react";
import { Pin, Maximize2, Minimize2, X } from "lucide-react";
import type { CanvasEvidence, CanvasSpec } from "@/lib/intent/canvasProtocol";
import styles from "./intent.module.css";
export default function CanvasBlock({
  block,
  evidence,
  pinned,
  expanded,
  selected,
  busy,
  onPin,
  onExpand,
  onRemove,
  onSelect,
  onFocus,
}: {
  block: CanvasSpec["blocks"][number];
  evidence: CanvasEvidence[];
  pinned: boolean;
  expanded: boolean;
  selected: string[];
  busy: boolean;
  onPin: () => void;
  onExpand: () => void;
  onRemove: () => void;
  onSelect: (id: string) => void;
  onFocus: () => void;
}) {
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const items = block.items
    .map((id) => evidence.find((item) => item.id === id))
    .filter((item): item is CanvasEvidence => !!item)
    .map((item) => ({ ...item, text: getReadableCanvasText(item.text) }))
    .map((item) =>
      item.title === "Instagram · saved post"
        ? { ...item, title: "Instagram" }
        : item,
    );
  return (
    <section
      data-canvas-block={block.id}
      tabIndex={-1}
      className={`${styles.compositionBlock} ${block.span === 2 || expanded ? styles.wideBlock : ""}`}
      aria-label={block.title}
      data-block-id={block.id}
      onFocus={onFocus}
    >
      <header className={styles.blockHeader}>
        <div>
          <span>
            {block.kind === "cards"
              ? "Sources & works"
              : block.kind === "quote"
                ? "Artist voice"
                : block.kind}
          </span>
          <h3>{block.title}</h3>
        </div>
        <div className={styles.blockActions}>
          <button
            disabled={busy}
            onClick={onPin}
            aria-label={`${pinned ? "Unpin" : "Pin"} ${block.title}`}
            aria-pressed={pinned}
          >
            <Pin size={14} />
          </button>
          <button
            disabled={busy}
            onClick={onExpand}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${block.title}`}
          >
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            disabled={busy || pinned}
            onClick={onRemove}
            aria-label={`Remove ${block.title}`}
          >
            <X size={15} />
          </button>
        </div>
      </header>
      <div
        className={
          block.kind === "timeline"
            ? styles.blockTimeline
            : block.kind === "comparison"
              ? styles.blockComparison
              : styles.blockCards
        }
      >
        {items.map((item) => (
          <article key={item.id} className={styles.evidenceCard}>
            {block.kind === "timeline" && (
              <time className={styles.blockYear}>{item.date?.slice(0, 4)}</time>
            )}
            <div className={styles.evidenceBody}>
              {item.image &&
                !failedImages.includes(item.id) &&
                block.kind !== "quote" && (
                  <a
                    href={item.workUrl ?? item.url}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.evidenceArt}
                    aria-label={`Open ${item.title}`}
                  >
                    <img
                      src={item.image}
                      alt={
                        item.mediaKind === "instagram"
                          ? `${item.title} · Instagram post image`
                          : `${item.title} artwork`
                      }
                      onError={() =>
                        setFailedImages((ids) => [...ids, item.id])
                      }
                    />
                    <span>
                      {item.mediaKind === "instagram"
                        ? "Open post"
                        : item.category === "film" ||
                            item.category === "process"
                          ? "Watch"
                          : "Listen"}{" "}
                      ↗
                    </span>
                  </a>
                )}
              {((item.mediaKind === "instagram" && !item.image) ||
                failedImages.includes(item.id)) && (
                <p className={styles.caveat}>
                  Image unavailable. Open the original post to view it.
                </p>
              )}
              {block.kind === "quote" && item.text ? (
                <blockquote>
                  “{item.text}”
                  <cite>
                    {item.attribution ??
                      "Attribution unavailable · inspect source"}
                  </cite>
                </blockquote>
              ) : (
                <>
                  <h4>{item.title}</h4>
                  <p>{item.text || "Open the source to read this record."}</p>
                </>
              )}
              <p className={styles.date}>
                {item.date
                  ? `${formatCanvasDate(item.date)} · ${item.dateKind}`
                  : item.dateKind}
              </p>
              <div className={styles.evidenceControls}>
                <button
                  disabled={busy}
                  onClick={() => onSelect(item.id)}
                  aria-pressed={selected.includes(item.id)}
                  aria-label={`Select ${item.title}`}
                >
                  {selected.includes(item.id) ? "Selected" : "Select"}
                </button>
                <a href={item.url} target="_blank" rel="noreferrer">
                  {item.category === "release" ? "Listen" : "Open source"} ↗
                </a>
              </div>
              {item.workUrl && (
                <a href={item.workUrl} target="_blank" rel="noreferrer">
                  Open the work on Bandcamp ↗
                </a>
              )}
              <details className={styles.source}>
                <summary>
                  {item.page
                    ? item.pagePreview
                      ? `Inspect PDF page ${item.page}`
                      : `Read cited passage · PDF p. ${item.page}`
                    : "Evidence & context"}
                </summary>
                <div>
                  {item.pagePreview && (
                    <a href={item.url} target="_blank" rel="noreferrer">
                      <img
                        className={styles.pdfPage}
                        src={item.pagePreview}
                        alt={`Original PDF page ${item.page}: ${item.title}`}
                      />
                    </a>
                  )}
                  <p>{item.attribution}</p>
                  <p>{item.text || "Open the source to read this record."}</p>
                  <p className={styles.caveat}>{item.limitation}</p>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    {item.page
                      ? `Open original PDF · page ${item.page}`
                      : "Read the original source"}
                  </a>
                </div>
              </details>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

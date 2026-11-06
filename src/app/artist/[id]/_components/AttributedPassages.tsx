import React from "react";
import type { AttributedAnswer } from "./getAttributedAnswer";

/** Literal source text is never parsed as citations, Markdown, links, or HTML. */
export function AttributedPassages({
  answer,
  stopped = false,
  failed = false,
}: {
  answer: AttributedAnswer;
  stopped?: boolean;
  failed?: boolean;
}) {
  const status =
    stopped || answer.state === "stopped"
      ? "Stopped. Displayed passages are partial."
      : failed || ["failed", "partial"].includes(answer.state)
        ? "Selection did not complete. Displayed passages are partial."
        : answer.state === "selecting"
          ? "Selecting source passages. This is a partial result."
          : answer.state === "unavailable"
            ? "No verified literal passages are available for this selection."
            : "Selected passages from the sources read; this selection may be incomplete.";
  return (
    <section aria-label="Selected source passages" className="space-y-3 px-1">
      <p role="status" className="text-sm">
        {status}
      </p>
      {answer.pdfTextUnavailable && (
        <p>
          Some PDF pages have no verified text for literal presentation. Consult
          the original for images and missing context.
        </p>
      )}
      {answer.passages.map((passage, index) => (
        <figure key={passage.id}>
          <blockquote
            className="whitespace-pre-wrap break-words"
            data-testid="literal-passage"
          >
            {passage.text}
          </blockquote>
          <figcaption>
            <span>{`Passage ${index + 1} · `}</span>
            <a href={passage.kind === "pdf-page-text" && typeof passage.physicalPage === "number" && typeof passage.physicalPages === "number" && Number.isSafeInteger(passage.physicalPage) && passage.physicalPage >= 1 && passage.physicalPage <= passage.physicalPages && passage.physicalPages <= 50 ? `${passage.url.split("#")[0]}#page=${passage.physicalPage}` : passage.url} target="_blank" rel="noopener noreferrer">
              {passage.title}
            </a>
            {passage.kind === "pdf-page-text" && (
              <span>
                {` · Physical page ${passage.physicalPage} of ${passage.physicalPages}. PDF text layer only; layout, images, and surrounding pages may provide additional context.`}
              </span>
            )}
            {passage.contextIncomplete || passage.coverage === "partial-read"
              ? " · Source excerpt; surrounding context may be omitted"
              : " · Full retained read window; source context may be incomplete"}
          </figcaption>
        </figure>
      ))}
      {answer.passages.length > 0 && (
        <p className="text-xs">
          Quoted from selected sources. A valid quotation does not establish
          that the selection is complete or resolves the question.
        </p>
      )}
    </section>
  );
}

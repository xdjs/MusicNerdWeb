/** @jest-environment node */
import { expect, it } from "@jest/globals";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getAttributedAnswer } from "../getAttributedAnswer";
import { AttributedPassages } from "../AttributedPassages";

const passage = {
  version: 1,
  id: "a".repeat(64),
  sourceId: "vault:1",
  revision: "r1",
  sha256: "b".repeat(64),
  n: 1,
  title: "Original",
  url: "https://source.example/a",
  text: "Literal [The Chill Factor] and [7]. <script>😀</script>",
  start: 0,
  end: 60,
  coverage: "partial-read",
  context: "whole-read-window",
};
type WireMessage = {
  parts: Array<{ type: string; data: Record<string, unknown> }>;
};
const message = (state = "complete-transport"): WireMessage => ({
  parts: [
    { type: "data-attributed-passage", data: passage },
    {
      type: "data-attributed-status",
      data: {
        version: 1,
        state,
        selectionMayBeIncomplete: true,
        pdfTextUnavailable: false,
      },
    },
  ],
});
it("renders original brackets and footnotes literally without executable HTML", () => {
  const answer = getAttributedAnswer(message())!;
  const html = renderToStaticMarkup(
    React.createElement(AttributedPassages, { answer }),
  );
  expect(html).toContain("[The Chill Factor] and [7]");
  expect(html).toContain("&lt;script&gt;😀&lt;/script&gt;");
  expect(html).not.toContain("<script>");
  expect(html).toContain("selection may be incomplete");
});
it("Stop remains visible when a passage already exists", () => {
  const html = renderToStaticMarkup(
    React.createElement(AttributedPassages, {
      answer: getAttributedAnswer(message())!,
      stopped: true,
    }),
  );
  expect(html).toContain("Stopped. Displayed passages are partial.");
  expect(html).toContain("[The Chill Factor]");
});
it("failed prefix remains visible and explicitly partial", () => {
  const html = renderToStaticMarkup(
    React.createElement(AttributedPassages, {
      answer: getAttributedAnswer(message())!,
      failed: true,
    }),
  );
  expect(html).toContain(
    "Selection did not complete. Displayed passages are partial.",
  );
});
it("ordinary text is outside the typed renderer", () =>
  expect(
    getAttributedAnswer({ parts: [{ type: "text", text: "ordinary [1]" }] }),
  ).toBeNull());
it("keeps useful passages while warning about unavailable PDF page text", () => {
  const input=message();input.parts[1].data.pdfTextUnavailable=true;
  const html=renderToStaticMarkup(React.createElement(AttributedPassages,{answer:getAttributedAnswer(input)!}));
  expect(html).toContain("[The Chill Factor]");
  expect(html).toContain("Some PDF pages have no verified text");
  expect(html).toContain("selection may be incomplete");
  expect(html).not.toContain("Original PDF text is unavailable");
});
it("ignores malformed or unsafe typed passage data", () => {
  const input = message();
  input.parts[0].data = { ...passage, url: "javascript:alert(1)" };
  expect(getAttributedAnswer(input)!.passages).toHaveLength(0);
});
it("labels bounded context conservatively without claiming semantic completeness", () => {
  const input = message();
  input.parts[0].data = {
    ...passage,
    coverage: "complete-read",
    contextIncomplete: true,
  };
  const html = renderToStaticMarkup(
    React.createElement(AttributedPassages, {
      answer: getAttributedAnswer(input)!,
    }),
  );
  expect(html).toContain("Source excerpt; surrounding context may be omitted");
  expect(html).not.toContain("Full read window");
});

function boundedMessage(lengths: number[]): WireMessage {
  return {
    parts: [
      ...lengths.map((length, index) => ({
        type: "data-attributed-passage",
        data: {
          ...passage,
          id: index.toString(16).padStart(64, "0"),
          n: index + 1,
          text: String.fromCharCode(65 + index).repeat(length),
        },
      })),
      message().parts[1],
    ],
  };
}

it("rejects a passage above 6000 characters without truncating literal text", () => {
  const answer = getAttributedAnswer(boundedMessage([6001]))!;
  expect(answer.state).toBe("failed");
  expect(answer.passages).toEqual([]);
  const html = renderToStaticMarkup(
    React.createElement(AttributedPassages, { answer }),
  );
  expect(html).not.toContain('data-testid="literal-passage"');
});

it("retains valid text exactly and marks partial if an oversized passage follows", () => {
  const answer = getAttributedAnswer(boundedMessage([2400, 6001]))!;
  expect(answer.state).toBe("partial");
  expect(answer.passages.map((p) => p.text)).toEqual(["A".repeat(2400)]);
});

it("rejects the twenty-fifth passage without changing the first 24", () => {
  const answer = getAttributedAnswer(boundedMessage(Array(25).fill(10)))!;
  expect(answer.state).toBe("partial");
  expect(answer.passages).toHaveLength(24);
  expect(answer.passages[23].text).toBe("X".repeat(10));
  const html = renderToStaticMarkup(
    React.createElement(AttributedPassages, { answer }),
  );
  expect(html.match(/data-testid="literal-passage"/g)).toHaveLength(24);
  expect(html).not.toContain("Y".repeat(10));
});

it("rejects a whole passage that would exceed 12000 total characters", () => {
  const answer = getAttributedAnswer(boundedMessage([6000, 6000, 1]))!;
  expect(answer.state).toBe("partial");
  expect(answer.passages.map((p) => p.text)).toEqual([
    "A".repeat(6000),
    "B".repeat(6000),
  ]);
  expect(answer.passages.reduce((n, p) => n + p.text.length, 0)).toBe(12000);
});

it("accepts multiple passages at the exact 12000-total boundary", () => {
  const answer = getAttributedAnswer(boundedMessage([6000, 6000]))!;
  expect(answer.state).toBe("complete-transport");
  expect(answer.passages.map((p) => p.text)).toEqual([
    "A".repeat(6000),
    "B".repeat(6000),
  ]);
});

it("accepts five short context passages under the shared budget", () => {
  const answer = getAttributedAnswer(
    boundedMessage([100, 100, 100, 100, 100]),
  )!;
  expect(answer.state).toBe("complete-transport");
  expect(answer.passages).toHaveLength(5);
});

const pdfMetadata = {
  kind: "pdf-page-text",
  originalSha256: "c".repeat(64),
  physicalPage: 2,
  physicalPages: 5,
  pageSha256: "d".repeat(64),
};
function pdfMessage(overrides: Record<string, unknown> = {}) {
  const input = boundedMessage([6000]);
  input.parts[0].data = {
    ...input.parts[0].data,
    ...pdfMetadata,
    ...overrides,
  };
  return input;
}

it("renders a complete 6000-character synthetic PDF text page literally with physical-page limitations", () => {
  const text = "[7] <script>" + "A".repeat(5988);
  expect(text).toHaveLength(6000);
  const answer = getAttributedAnswer(pdfMessage({ text }))!;
  expect(answer.state).toBe("complete-transport");
  expect(answer.passages[0].text).toBe(text);
  const html = renderToStaticMarkup(
    React.createElement(AttributedPassages, { answer }),
  );
  expect(html).toContain("Physical page 2 of 5");
  expect(html).toContain(
    "PDF text layer only; layout, images, and surrounding pages may provide additional context.",
  );
  expect(html).toContain("[7] &lt;script&gt;");
  expect(html).not.toContain("<script>");
});

it.each([
  { originalSha256: undefined },
  { originalSha256: "invalid" },
  { pageSha256: "D".repeat(64) },
  { pageSha256: undefined },
  { physicalPage: 0 },
  { physicalPage: 6 },
  { physicalPage: 1.5 },
  { physicalPage: "2" },
  { physicalPage: Number.MAX_SAFE_INTEGER + 1 },
  { physicalPages: 0 },
  { physicalPages: "5" },
  { physicalPages: 2.5 },
  { physicalPages: undefined },
  { kind: undefined },
  { kind: "pdf" },
])(
  "rejects invalid or incomplete PDF metadata %j before displaying the passage",
  (overrides) => {
    const answer = getAttributedAnswer(pdfMessage(overrides))!;
    expect(answer.state).toBe("failed");
    expect(answer.passages).toHaveLength(0);
  },
);

it("enforces UTF16 literal text budget independently of JSON escaping", () => {
  const input = boundedMessage([1]);
  input.parts[0].data = {
    ...input.parts[0].data,
    text: "\n".repeat(6000),
  };
  expect(getAttributedAnswer(input)!.passages[0].text).toBe("\n".repeat(6000));
  input.parts[0].data = {
    ...input.parts[0].data,
    text: "😀".repeat(3001),
  };
  expect(getAttributedAnswer(input)!.state).toBe("failed");
});

it("rejects oversized UTF8 serialized metadata even when literal text is tiny", () => {
  const input = boundedMessage([1]);
  // Unicode payload is below the byte limit in UTF16 units but above it in UTF8.
  input.parts[0].data = {
    ...input.parts[0].data,
    extra: "界".repeat(22000),
  };
  expect(JSON.stringify(input.parts[0].data).length).toBeLessThan(65536);
  const answer = getAttributedAnswer(input)!;
  expect(answer.state).toBe("failed");
  expect(answer.passages).toHaveLength(0);
});

it("enforces 65536 serialized bytes cumulatively, rejecting the whole next record", () => {
  const input = boundedMessage([1, 1]);
  for (let i = 0; i < 2; i++)
    input.parts[i].data = {
      ...input.parts[i].data,
      extra: "x".repeat(33000),
    };
  const answer = getAttributedAnswer(input)!;
  expect(answer.state).toBe("partial");
  expect(answer.passages.map((p) => p.text)).toEqual(["A"]);
});

it("accepts exactly 65536 serialized bytes and rejects one byte beyond", () => {
  const input = boundedMessage([1]);
  const data = { ...input.parts[0].data, extra: "" };
  const baseBytes = new TextEncoder().encode(JSON.stringify(data)).byteLength;
  data.extra = "x".repeat(65536 - baseBytes);
  input.parts[0].data = data;
  expect(getAttributedAnswer(input)!.state).toBe("complete-transport");
  data.extra += "x";
  expect(getAttributedAnswer(input)!.state).toBe("failed");
});

it("rejects an unsupported passage kind rather than inventing a label", () => {
  const input = boundedMessage([10]);
  input.parts[0].data = {
    ...input.parts[0].data,
    kind: "model-prose",
  };
  expect(getAttributedAnswer(input)!.state).toBe("failed");
  expect(getAttributedAnswer(input)!.passages).toHaveLength(0);
});

it("accepts and preserves PDF revisions containing SQL timestamp spaces and dots", () => {
  const revision = "2026-11-06 12:34:56.123456+00";
  const answer = getAttributedAnswer(pdfMessage({ revision }))!;
  expect(answer.state).toBe("complete-transport");
  expect(answer.passages[0].revision).toBe(revision);
});

it("PDF citations navigate to their own physical pages while canonical source URLs stay unchanged",()=>{
 const first=pdfMessage({text:"Physical page two.",physicalPage:2,physicalPages:13,url:"https://example.test/original.pdf?download=1#old"});
 const second=pdfMessage({text:"Physical page ten.",id:"b".repeat(64),physicalPage:10,physicalPages:13,url:"https://example.test/original.pdf?download=1#old"});
 const input={parts:[first.parts[0],second.parts[0],first.parts[1]]};
 const answer=getAttributedAnswer(input)!;
 const html=renderToStaticMarkup(React.createElement(AttributedPassages,{answer}));
 expect(html).toContain('href="https://example.test/original.pdf?download=1#page=2"');
 expect(html).toContain('href="https://example.test/original.pdf?download=1#page=10"');
 expect(answer.passages.map(p=>p.url)).toEqual(["https://example.test/original.pdf?download=1#old","https://example.test/original.pdf?download=1#old"]);
});

it("rejects a PDF page inventory above the supported fifty-page bound", () => { expect(getAttributedAnswer(pdfMessage({ physicalPages: 51 }))!.passages).toHaveLength(0); });

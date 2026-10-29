import { render, screen, fireEvent } from "@testing-library/react";
import CanvasBlock from "../CanvasBlock";
import type { CanvasEvidence } from "@/lib/intent/canvasProtocol";
const evidence: CanvasEvidence = {
  id: "page-seven",
  title: "Archive passage",
  text: "An exact cited passage.",
  category: "document",
  url: "https://example.com/archive.pdf#page=7",
  page: 7,
  date: null,
  dateKind: "Publication date unavailable",
  attribution: "Narrator",
  limitation: "Not artist testimony.",
};
it.each([false, true])(
  "labels a PDF disclosure according to rendered page availability (%s)",
  (hasImage) => {
    render(
      <CanvasBlock
        block={{
          id: "archive",
          title: "Archive",
          kind: "document",
          items: [evidence.id],
          span: 1,
        }}
        evidence={[
          {
            ...evidence,
            ...(hasImage ? { pagePreview: "/demo/page7.jpg" } : {}),
          },
        ]}
        pinned={false}
        expanded={false}
        selected={[]}
        busy={false}
        onPin={jest.fn()}
        onExpand={jest.fn()}
        onRemove={jest.fn()}
        onSelect={jest.fn()}
        onFocus={jest.fn()}
      />,
    );
    expect(
      screen.getByText(
        hasImage ? "Inspect PDF page 7" : "Read cited passage · PDF p. 7",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Open original PDF · page 7")).toHaveAttribute(
      "href",
      evidence.url,
    );
  },
);

it("uses a post action and clear fallback when an Instagram thumbnail fails", () => {
  render(
    <CanvasBlock
      block={{
        id: "post",
        title: "Post",
        kind: "media",
        items: [evidence.id],
        span: 1,
      }}
      evidence={[
        {
          ...evidence,
          image: "https://example.com/image.webp",
          mediaKind: "instagram",
        },
      ]}
      pinned={false}
      expanded={false}
      selected={[]}
      busy={false}
      onPin={jest.fn()}
      onExpand={jest.fn()}
      onRemove={jest.fn()}
      onSelect={jest.fn()}
      onFocus={jest.fn()}
    />,
  );
  expect(screen.getByText(/Open post/)).toBeInTheDocument();
  fireEvent.error(screen.getByRole("img"));
  expect(screen.getByText(/Image unavailable/)).toBeInTheDocument();
});

it.each([
  ["Title: Salsa System (EP) · Type: EP · Release date: 2006-01-01", true],
  [
    '{ "provider": "deezer", "artist_account": "416544", "title": "Salsa System (EP)" }',
    false,
  ],
  ["0 Skip to Content English English Salsa System Electric Cowbell", false],
])(
  "renders release evidence as readable fields or a source fallback: %s",
  (text, readable) => {
    render(
      <CanvasBlock
        block={{
          id: "release",
          title: "Release evidence",
          kind: "cards",
          items: ["release"],
          span: 1,
        }}
        evidence={[
          {
            id: "release",
            title: "Salsa System (EP)",
            text,
            category: "source",
            url: "https://www.deezer.com/album/6733078",
            date: "2006-01-01",
            dateKind: "Release date from stored provider record",
            attribution: "Deezer · stored release metadata",
            limitation: "Provider metadata, not an artist quotation.",
          },
        ]}
        pinned={false}
        expanded={false}
        selected={[]}
        busy={false}
        onPin={jest.fn()}
        onExpand={jest.fn()}
        onRemove={jest.fn()}
        onSelect={jest.fn()}
        onFocus={jest.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Salsa System (EP)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Jan 1, 2006 · Release date from stored provider record",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Read the original source")).toHaveAttribute(
      "href",
      "https://www.deezer.com/album/6733078",
    );
    if (readable) expect(screen.getAllByText(text)).toHaveLength(2);
    else {
      expect(screen.queryByText(text)).not.toBeInTheDocument();
      expect(
        screen.getAllByText("Open the source to read this record."),
      ).toHaveLength(2);
    }
  },
);

import { render, screen } from "@testing-library/react";
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

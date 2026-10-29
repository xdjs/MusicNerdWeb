import { render, screen } from "@testing-library/react";
import CanvasMessage from "../CanvasMessage";
it.each(["", "Need the archive PDF passage."])(
  "shows committed explanation when model ends with %s",
  (text) => {
    render(
      <CanvasMessage
        message={{
          id: "turn",
          role: "assistant",
          parts: [{ type: "text", text }],
        }}
        explanation="I added the physical PDF page. The source does not establish a release date."
      />,
    );
    expect(screen.getByText(/I added the physical/)).toBeInTheDocument();
    expect(
      screen.queryByText("Need the archive PDF passage."),
    ).not.toBeInTheDocument();
  },
);

it("keeps citations in committed explanations even when streamed prose is empty", () => {
  render(
    <CanvasMessage
      message={{
        id: "x",
        role: "assistant",
        parts: [
          {
            type: "source-url",
            sourceId: "1",
            url: "https://example.com/source",
            title: "Original",
          },
        ],
      }}
      explanation="The source does not establish a date [1]."
    />,
  );
  expect(screen.getByRole("link", { name: "[1]" })).toHaveAttribute(
    "href",
    "https://example.com/source",
  );
});

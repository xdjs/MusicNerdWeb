import { fireEvent, render, screen } from "@testing-library/react";
import ArtistEntry from "../ArtistEntry";

jest.mock("../IntentExplorer", () => ({
  __esModule: true,
  default: ({ initialIntent }: { initialIntent?: string }) => (
    <div data-testid="workspace">
      {initialIntent ?? "No automatic question"}
    </div>
  ),
}));
beforeEach(() => sessionStorage.clear());
it("opens a name-only search without submitting a model question", () => {
  render(<ArtistEntry liveApiUrl="https://example.com" />);
  fireEvent.change(screen.getByLabelText("Artist or question"), {
    target: { value: "  LATASHÁ  " },
  });
  fireEvent.click(screen.getByRole("button", { name: /^Explore ↗$/ }));
  expect(screen.getByTestId("workspace")).toHaveTextContent(
    "No automatic question",
  );
});
it("carries an artist-plus-intent question into the workspace", () => {
  render(<ArtistEntry />);
  const question = "Dutchyyy’s approach to improvisation";
  fireEvent.change(screen.getByLabelText("Artist or question"), {
    target: { value: question },
  });
  fireEvent.click(screen.getByRole("button", { name: /^Explore ↗$/ }));
  expect(screen.getByTestId("workspace")).toHaveTextContent(question);
});
it("explains ambiguous and unsupported searches", () => {
  render(<ArtistEntry />);
  fireEvent.change(screen.getByLabelText("Artist or question"), {
    target: { value: "LATASHA and Dutchyyy" },
  });
  expect(screen.getByRole("status")).toHaveTextContent("Choose an artist");
  expect(screen.getByRole("button", { name: /^Explore ↗$/ })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Artist or question"), {
    target: { value: "Dutchyy’s music" },
  });
  expect(screen.getByRole("status")).toHaveTextContent("No connected artist");
});

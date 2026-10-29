import { render, screen, fireEvent } from "@testing-library/react";
import PreviewExplorationShell from "../PreviewExplorationShell";
import PreviewArtistRegistration from "../PreviewArtistRegistration";
let mockPath = "/";
jest.mock("next/navigation", () => ({ usePathname: () => mockPath }));
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, animate, initial, transition, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
  useReducedMotion: () => true,
}));
jest.mock("../../HomePageSplash", () => ({
  __esModule: true,
  default: () => <div data-home-search-anchor>Home manifesto</div>,
}));
jest.mock("../../nav/NavContent", () => ({
  __esModule: true,
  default: () => (
    <nav>
      <div data-header-search-anchor />
    </nav>
  ),
}));
jest.mock("../../Footer", () => ({ __esModule: true, default: () => null }));
jest.mock("../../nav/components/AddArtist", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("../../nav/components/SearchBar", () => ({
  __esModule: true,
  default: () => <input data-testid="persistent-search" />,
}));
jest.mock("@/app/dev/intent-preview/IntentExplorer", () => ({
  __esModule: true,
  default: () => <input data-testid="persistent-composer" />,
}));
it("keeps the actual search and artist DOM nodes across home, exploration and Back", () => {
  mockPath = "/";
  const view = render(
    <PreviewExplorationShell>{null}</PreviewExplorationShell>,
  );
  expect(screen.getByText("Home manifesto").parentElement).toHaveStyle({
    overflow: "visible",
  });
  const search = screen.getByTestId("persistent-search");
  fireEvent.change(search, { target: { value: "Dutchyyy" } });
  mockPath = "/artist/example/explore";
  view.rerender(
    <PreviewExplorationShell>
      <PreviewArtistRegistration artistId="example" initialEvidence={[]} />
    </PreviewExplorationShell>,
  );
  expect(screen.getByTestId("persistent-search")).toBe(search);
  expect(search).toHaveValue("Dutchyyy");
  expect(
    view.container.querySelector("[data-exploration-shell]"),
  ).toHaveAttribute("data-exploring", "true");
  expect(screen.getByText("Home manifesto").parentElement).toHaveStyle({
    overflow: "hidden",
  });
  const composer = screen.getByTestId("persistent-composer");
  fireEvent.change(composer, { target: { value: "An unfinished follow-up" } });
  mockPath = "/";
  view.rerender(<PreviewExplorationShell>{null}</PreviewExplorationShell>);
  expect(screen.getByTestId("persistent-composer")).toBe(composer);
  expect(composer).toHaveValue("An unfinished follow-up");
  expect(
    view.container.querySelector("[data-exploration-shell]"),
  ).toHaveAttribute("data-exploring", "false");
  expect(screen.getAllByTestId("persistent-search")).toHaveLength(1);
  expect(screen.getByText("Home manifesto").parentElement).toHaveStyle({
    overflow: "visible",
  });
});

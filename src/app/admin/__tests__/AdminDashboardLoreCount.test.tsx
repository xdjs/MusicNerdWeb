import { render, screen } from "@testing-library/react";
import AdminDashboard from "../AdminDashboard";

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

it("keeps the overall Lore review count visible when a search has no matches", () => {
  const pendingLore = { items: [], total: 0, pendingTotal: 173, page: 1, pageSize: 25, query: "LATASHA" };
  render(<AdminDashboard pendingUGCData={[]} pendingLore={pendingLore} allUsers={[]} mcpKeys={[]} allClaims={[]} initialSection="lore" />);

  expect(screen.getByRole("button", { name: "Review 173 pending Lore sources" })).toBeInTheDocument();
  expect(screen.getByText("No pending Lore sources match this search.")).toBeInTheDocument();
});

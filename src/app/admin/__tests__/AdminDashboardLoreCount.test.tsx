import { render, screen } from "@testing-library/react";
import AdminDashboard from "../AdminDashboard";

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

it("keeps the overall Lore review count visible when a search has no matches", () => {
  const pendingLore = { items: [], origin: '', claim: '', total: 0, pendingTotal: 173, page: 1, pageSize: 25, query: "LATASHA" };
  render(<AdminDashboard pendingUGCData={[]} pendingLore={pendingLore} allUsers={[]} mcpKeys={[]} allClaims={[]} initialSection="lore" />);

  expect(screen.getByRole("button", { name: "Review 173 pending Lore sources" })).toBeInTheDocument();
  expect(screen.getByText("No pending Lore sources match this search.")).toBeInTheDocument();
});

it('keeps review navigation in the sidebar instead of duplicate header buttons', () => {
 render(<AdminDashboard pendingUGCData={[]} pendingLore={{pendingTotal:0,rows:[],total:0,page:1,pageSize:25} as never} allUsers={[]} mcpKeys={[]} allClaims={[]} correctionsCount={1} correctionsContent={<p>Correction report</p>} initialSection="corrections"/>);
 expect(screen.getByRole('tab',{name:'About corrections 1'})).toBeVisible();
 expect(screen.queryByRole('link',{name:'Review user submissions'})).not.toBeInTheDocument();
 expect(screen.queryByRole('link',{name:'Review About corrections'})).not.toBeInTheDocument();
});

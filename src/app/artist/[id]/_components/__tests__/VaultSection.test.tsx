import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditModeContext } from "@/app/_components/EditModeContext";
import VaultSection from "../VaultSection";
import { OnboardingProgressContext } from "../onboarding/OnboardingProgressContext";

jest.mock("../PressAndFeatures", () => function MockPressAndFeatures() { return <div>Public Lore</div>; });
jest.mock("../VaultManager", () => function MockVaultManager() { return <div>Editor Lore controls</div>; });
jest.mock("../BioVersionHistory", () => function MockBioVersionHistory() { return <div>Saved bios</div>; });
jest.mock("../SuggestLoreSource", () => function MockSuggestLoreSource({ autoApprove }: { autoApprove: boolean }) { return <div data-testid="suggestion" data-auto={String(autoApprove)}>Visitor suggestion form</div>; });

const props = { artistId: "artist-1", isClaimed: true, approvedSources: [], pendingSources: [] };

it('passes trusted submission access without granting editor controls', () => {
  render(<EditModeContext.Provider value={{ isEditing: false, canEdit: false, toggle: jest.fn() }}>
    <VaultSection {...props} autoApprove />
  </EditModeContext.Provider>);
  expect(screen.getByTestId('suggestion')).toHaveAttribute('data-auto', 'true');
  expect(screen.queryByText('Editor Lore controls')).not.toBeInTheDocument();
});

it("gives admins and artist owners an obvious route into Lore editing", () => {
  const toggle = jest.fn();
  render(<EditModeContext.Provider value={{ isEditing: false, canEdit: true, toggle }}>
    <VaultSection {...props} />
  </EditModeContext.Provider>);
  fireEvent.click(screen.getByRole("button", { name: "Add to Lore" }));
  expect(toggle).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Visitor suggestion form")).not.toBeInTheDocument();
});

it("shows the suggestion path to visitors and edit controls only in edit mode", () => {
  const { rerender } = render(<EditModeContext.Provider value={{ isEditing: false, canEdit: false, toggle: jest.fn() }}>
    <VaultSection {...props} />
  </EditModeContext.Provider>);
  expect(screen.getByText("Visitor suggestion form")).toBeInTheDocument();
  expect(screen.queryByText("Editor Lore controls")).not.toBeInTheDocument();
  rerender(<EditModeContext.Provider value={{ isEditing: true, canEdit: true, toggle: jest.fn() }}>
    <VaultSection {...props} />
  </EditModeContext.Provider>);
  expect(screen.getByText("Editor Lore controls")).toBeInTheDocument();
  expect(screen.queryByText("Visitor suggestion form")).not.toBeInTheDocument();
});

describe('VaultSection while research reads sources', () => {
  it('shows a loading line above the Lore until the vault step is confirmed', () => {
    const steps = { profiles: 't1', vault: null, interview: null, publish: null };
    render(<OnboardingProgressContext.Provider value={steps}><VaultSection artistId="a1" isClaimed pendingSources={[]} approvedSources={[]} /></OnboardingProgressContext.Provider>);
    expect(screen.getByRole('status')).toHaveTextContent('reading what’s written about you…');
    expect(screen.getByText('Public Lore')).toBeInTheDocument();
  });
});

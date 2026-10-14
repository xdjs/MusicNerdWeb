import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditModeContext } from "@/app/_components/EditModeContext";
import VaultSection from "../VaultSection";
import { OnboardingProgressContext } from "../onboarding/OnboardingProgressContext";
const researchNone = { profiles: null, vault: null, interview: null, publish: null };
const research = (over = {}) => ({ steps: researchNone, currentStep: null, fresh: { profiles: false, vault: false, publish: false }, markSeen: jest.fn(), complete: false, baseline: { links: [], sources: [] }, ...over });


jest.mock("../PressAndFeatures", () => function MockPressAndFeatures() { return <div>Public Lore</div>; });
jest.mock("../VaultManager", () => function MockVaultManager() { return <div>Editor Lore controls</div>; });
jest.mock("../BioVersionHistory", () => function MockBioVersionHistory() { return <div>Saved bios</div>; });
jest.mock("../SuggestLoreSource", () => function MockSuggestLoreSource({ autoApprove }: { autoApprove: boolean }) { return <div data-testid="suggestion" data-auto={String(autoApprove)}>Visitor suggestion form</div>; });

jest.mock("../ArtistInterviews", () => function MockInterviews() { return <label>Draft response<input aria-label="Draft response" /></label>; });

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
  it('shows only source-card skeletons while existing Lore is being researched', () => {
    const steps = { profiles: 't1', vault: null, interview: null, publish: null };
    render(<OnboardingProgressContext.Provider value={research({ steps, currentStep: 'vault' })}><VaultSection artistId="a1" isClaimed pendingSources={[]} approvedSources={[{ id: 'saved-source', status: 'approved', type: 'article' }] as never} /></OnboardingProgressContext.Provider>);
    const status = screen.getByRole('status', { name: 'reading what’s written about you…' });
    expect(status.querySelectorAll('[data-skeleton=card]').length).toBeGreaterThan(0);
    expect(screen.queryByText('Public Lore')).not.toBeInTheDocument();
  });

  it('hides existing editor content while waiting and researching, then restores it when Lore is confirmed', () => {
    const saved = [{ id: 'saved-source', status: 'approved', type: 'article' }];
    const view = (value: React.ContextType<typeof OnboardingProgressContext>) => <OnboardingProgressContext.Provider value={value}>
      <EditModeContext.Provider value={{ isEditing: true, canEdit: true, toggle: jest.fn() }}>
        <VaultSection {...props} approvedSources={saved as never} />
      </EditModeContext.Provider>
    </OnboardingProgressContext.Provider>;
    const { rerender, container } = render(view(research({ currentStep: 'profiles' })));
    expect(container.querySelector('[data-skeleton=card]')).not.toBeNull();
    expect(screen.queryByText('Editor Lore controls')).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Questions/ })).not.toBeInTheDocument();
    rerender(view(research({ currentStep: 'vault' })));
    expect(screen.getByRole('status', { name: 'reading what’s written about you…' })).toBeInTheDocument();
    expect(screen.queryByText('Editor Lore controls')).not.toBeInTheDocument();
    rerender(view(research({ steps: { ...researchNone, profiles: 't1', vault: 't2' }, currentStep: 'interview' })));
    expect(container.querySelector('[data-skeleton=card]')).toBeNull();
    expect(screen.getByText('Editor Lore controls')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Questions/ })).toBeInTheDocument();
  });

  it('restores public Lore after confirmation and outside a watched build', () => {
    const view = (value: React.ContextType<typeof OnboardingProgressContext>) => <OnboardingProgressContext.Provider value={value}><VaultSection {...props} /></OnboardingProgressContext.Provider>;
    const { rerender, container } = render(view(research({ currentStep: 'vault' })));
    expect(screen.queryByText('Public Lore')).not.toBeInTheDocument();
    rerender(view(research({ steps: { ...researchNone, profiles: 't1', vault: 't2' }, currentStep: 'interview' })));
    expect(screen.getByText('Public Lore')).toBeInTheDocument();
    expect(container.querySelector('[data-skeleton=card]')).toBeNull();
    rerender(view(null));
    expect(screen.getByText('Public Lore')).toBeInTheDocument();
  });

  it('preserves an interview draft when the fresh Lore highlight clears', () => {
    const steps = { ...researchNone, profiles: 't1', vault: 't2' };
    const view = (fresh: boolean) => <OnboardingProgressContext.Provider value={research({ steps, fresh: { profiles: false, vault: fresh, publish: false } })}>
      <EditModeContext.Provider value={{ isEditing: true, canEdit: true, toggle: jest.fn() }}><VaultSection {...props} /></EditModeContext.Provider>
    </OnboardingProgressContext.Provider>;
    const { rerender } = render(view(true));
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Questions' }), { button: 0, ctrlKey: false });
    fireEvent.change(screen.getByLabelText('Draft response'), { target: { value: 'Keep these words' } });
    rerender(view(false));
    expect(screen.getByRole('tab', { name: 'Questions' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByLabelText('Draft response')).toHaveValue('Keep these words');
  });

  it('counts the sources that arrived when the Lore lands', () => {
    const steps = { profiles: 't1', vault: 't2', interview: null, publish: null };
    const approvedSources = [{ id: 's-old', url: 'https://a.example/1', status: 'approved', type: 'article' }, { id: 's-new', url: 'https://b.example/2', status: 'approved', type: 'article' }];
    render(<OnboardingProgressContext.Provider value={research({ steps, fresh: { profiles: false, vault: true, publish: false }, baseline: { links: [], sources: ['s-old'] } })}><VaultSection artistId="a1" isClaimed pendingSources={[]} approvedSources={approvedSources as never} /></OnboardingProgressContext.Provider>);
    expect(screen.getByText('1 new')).toBeInTheDocument();
  });
});

it("keeps Questions adjacent to Lore and preserves an unfinished answer across tabs and collapse", () => {
  render(<EditModeContext.Provider value={{ isEditing:true, canEdit:true,toggle:jest.fn() }}><VaultSection {...props} /></EditModeContext.Provider>);
  expect(screen.getAllByRole("tab").map(tab=>tab.textContent)).toEqual(["Lore 0","Questions","Bios"]);
  fireEvent.mouseDown(screen.getByRole("tab", {name:"Questions"}),{button:0,ctrlKey:false});
  fireEvent.change(screen.getByLabelText("Draft response"),{target:{value:"Still writing"}});
  fireEvent.mouseDown(screen.getByRole("tab",{name:"Bios"}),{button:0,ctrlKey:false});
  fireEvent.click(screen.getByRole("button",{name:"Collapse Lore"}));
  expect(screen.getByRole("button",{name:"Expand Lore"})).toHaveAttribute("aria-expanded","false");
  fireEvent.click(screen.getByRole("button",{name:"Expand Lore"}));
  fireEvent.mouseDown(screen.getByRole("tab",{name:"Questions"}),{button:0,ctrlKey:false});
  expect(screen.getByLabelText("Draft response")).toHaveValue("Still writing");
});

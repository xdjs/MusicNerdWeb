/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import VaultSection from '@/app/artist/[id]/_components/VaultSection';
import { EditModeContext } from '@/app/_components/EditModeContext';

jest.mock('@/app/artist/[id]/_components/RevealSection', () => function RevealSection({ children }: any) { return <section>{children}</section>; });
jest.mock('@/app/artist/[id]/_components/PressAndFeatures', () => function PressAndFeatures() { return <div data-testid="press" />; });
jest.mock('@/app/artist/[id]/_components/VaultManager', () => function VaultManager() { return <div data-testid="vault-manager" />; });

const approved = [{ id: 'a', artistId: 'x', url: 'u', status: 'approved' }];

function renderCtx(value: { isEditing: boolean; canEdit: boolean }, props: any) {
  return render(
    <EditModeContext.Provider value={{ ...value, toggle: jest.fn() }}>
      <VaultSection artistId="x" pendingSources={[]} approvedSources={props.approvedSources} />
    </EditModeContext.Provider>
  );
}

describe('VaultSection visibility', () => {
  it('keeps the Lore destination visible for an idle editor with no approved sources', () => {
    renderCtx({ isEditing: false, canEdit: true }, { approvedSources: [] });
    expect(screen.getByRole('heading', { name: 'Lore' })).toBeVisible();
    expect(screen.getByText(/No published sources yet/)).toBeVisible();
    expect(screen.queryByTestId('vault-manager')).not.toBeInTheDocument();
  });

  it('shows for a public viewer when approved sources exist', () => {
    renderCtx({ isEditing: false, canEdit: false }, { approvedSources: approved });
    expect(screen.getByText('Lore')).toBeInTheDocument();
    expect(screen.getByTestId('press')).toBeInTheDocument();
  });

  it('shows for an editor in edit mode even with no approved sources', () => {
    renderCtx({ isEditing: true, canEdit: true }, { approvedSources: [] });
    expect(screen.getByText('Lore')).toBeInTheDocument();
    expect(screen.getByTestId('vault-manager')).toBeInTheDocument();
  });

  it('gives public viewers an empty Lore state without exposing editor controls', () => {
    renderCtx({ isEditing: false, canEdit: false }, { approvedSources: [] });
    expect(screen.getByRole('heading', { name: 'Lore' })).toBeVisible();
    expect(screen.getByText(/No published sources yet/)).toBeVisible();
    expect(screen.queryByTestId('press')).not.toBeInTheDocument();
    expect(screen.queryByTestId('vault-manager')).not.toBeInTheDocument();
  });
});

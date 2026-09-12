/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import VaultSection from '@/app/artist/[id]/_components/VaultSection';
import { EditModeContext } from '@/app/_components/EditModeContext';

jest.mock('@/app/artist/[id]/_components/RevealSection', () => function RevealSection({ children }: any) { return <section>{children}</section>; });
jest.mock('@/app/artist/[id]/_components/VaultManager', () => function VaultManager() { return <div data-testid="vault-manager" />; });

const approved = [{ id: 'a', artistId: 'x', url: 'https://example.com/interview', title: 'Artist interview', status: 'approved' }];

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
    expect(screen.getByText(/No Lore sources to show yet/)).toBeVisible();
    expect(screen.queryByTestId('vault-manager')).not.toBeInTheDocument();
  });

  it('shows for a public viewer when approved sources exist', () => {
    renderCtx({ isEditing: false, canEdit: false }, { approvedSources: approved });
    expect(screen.getByText('Lore')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Artist interview/ })).toHaveAttribute('href', 'https://example.com/interview');
    expect(screen.queryByText(/No Lore sources to show yet/)).not.toBeInTheDocument();
  });

  it('shows for an editor in edit mode even with no approved sources', () => {
    renderCtx({ isEditing: true, canEdit: true }, { approvedSources: [] });
    expect(screen.getByText('Lore')).toBeInTheDocument();
    expect(screen.getByTestId('vault-manager')).toBeInTheDocument();
  });

  it('gives public viewers an empty Lore state without exposing editor controls', () => {
    renderCtx({ isEditing: false, canEdit: false }, { approvedSources: [] });
    expect(screen.getByRole('heading', { name: 'Lore' })).toBeVisible();
    expect(screen.getByText(/No Lore sources to show yet/)).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByTestId('vault-manager')).not.toBeInTheDocument();
  });

  it('uses the actual carousel filtering for website-only and mixed inventories', () => {
    const website = { ...approved[0], id: 'site', type: 'website', url: 'https://artist.example', title: 'Official website' };
    const { unmount } = renderCtx({ isEditing: false, canEdit: false }, { approvedSources: [website] });
    expect(screen.getByText(/No Lore sources to show yet/)).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    unmount();
    renderCtx({ isEditing: false, canEdit: false }, { approvedSources: [website, ...approved] });
    expect(screen.getByRole('link', { name: /Artist interview/ })).toBeVisible();
    expect(screen.queryByRole('link', { name: /Official website/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/No Lore sources to show yet/)).not.toBeInTheDocument();
  });
});

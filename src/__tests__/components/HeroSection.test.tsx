/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingProgressContext } from '@/app/artist/[id]/_components/onboarding/OnboardingProgressContext';
import HeroSection from '@/app/artist/[id]/_components/HeroSection';
const researchNone = { profiles: null, vault: null, interview: null, publish: null };
const research = (over = {}) => ({ steps: researchNone, fresh: { profiles: false, vault: false, publish: false }, markSeen: jest.fn(), baseline: { links: [], sources: [] }, ...over });

import { EditModeContext } from '@/app/_components/EditModeContext';

function renderWith(isEditing: boolean, refreshProfile = jest.fn()) {
  return render(
    <EditModeContext.Provider value={{ isEditing, canEdit: true, toggle: jest.fn(), refreshProfile }}>
      <HeroSection imageUrl="/x.png" artistName="Test" artistId="a1" />
    </EditModeContext.Provider>
  );
}

describe('HeroSection image upload overlay', () => {
  it('shows the change-photo control in edit mode', () => {
    renderWith(true);
    expect(screen.getByLabelText(/change photo/i)).toBeInTheDocument();
  });

  it('hides the control when not editing', () => {
    renderWith(false);
    expect(screen.queryByLabelText(/change photo/i)).not.toBeInTheDocument();
  });
});


describe('Museum hero', () => {
  it('uses the supplied portrait and real listening destination', () => {
    const { container } = render(<HeroSection imageUrl="/portrait.jpg" artistName="Nova" artistId="a1" hasPortrait bio="Music from Miami." listenLinks={[{ siteName: "deezer", label: "Deezer", iconSrc: "/siteIcons/deezer_icon.svg", href: "https://www.deezer.com/artist/123" }]} />);
    expect(container.querySelector('[data-artist-portrait]')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Nova' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Listen' }));
    expect(screen.getByRole('link', { name: /Deezer/ })).toHaveAttribute('href', 'https://www.deezer.com/artist/123');
    expect(screen.queryByRole('link', { name: 'Read the story' })).not.toBeInTheDocument();
  });
  it('keeps a thumbnail treatment without a custom portrait or invented Listen link', () => {
    const { container } = render(<HeroSection imageUrl="/small.jpg" artistName="Nova" artistId="a1" />);
    expect(container.querySelector('[data-artist-fallback]')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Listen' })).not.toBeInTheDocument();
  });
  it('switches to the portrait after an authorized successful photo upload', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ imagePath: '/new.jpg' }) } as Response);
    const refreshProfile = jest.fn();
    const { container } = renderWith(true, refreshProfile);
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [new File(['image'], 'portrait.png', { type: 'image/png' })] } });
    await waitFor(() => expect(container.querySelector('[data-artist-portrait]')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith('/api/artist/profile-image', expect.objectContaining({ method: 'POST', body: expect.any(FormData) }));
    expect(refreshProfile).toHaveBeenCalledTimes(1);
    fetchMock.mockRestore();
  });
});


describe('Hero biography', () => {
  it('expands and collapses the complete biography without changing the saved text', () => {
    const bio = 'A musician with a long history. '.repeat(12) + 'The final sentence.';
    render(<HeroSection imageUrl="/portrait.jpg" artistName="Nova" artistId="a1" hasPortrait bio={bio} />);
    expect(screen.queryByText(/The final sentence/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Read more' }));
    expect(screen.getByText(/The final sentence/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.queryByText(/The final sentence/)).not.toBeInTheDocument();
  });
});

it('refreshes all server-provided portrait consumers after provider selection', async () => {
  const refreshProfile = jest.fn();
  const fetchMock = jest.spyOn(global, 'fetch')
    .mockResolvedValueOnce({ ok: true, json: async () => ({ expectedCustomImage: null, options: [{ source: 'spotify', providerId: 'sp', imageUrl: 'https://i.scdn.co/image/chosen' }] }) } as Response)
    .mockResolvedValueOnce({ ok: true, json: async () => ({ imagePath: 'https://i.scdn.co/image/chosen', position: 0 }) } as Response);
  renderWith(true, refreshProfile);
  fireEvent.click(screen.getByRole('button', { name: 'Change photo' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Choose Spotify photo' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save photo' }));
  await waitFor(() => expect(refreshProfile).toHaveBeenCalledTimes(1));
  fetchMock.mockRestore();
});

describe('Hero About while research writes it', () => {
  it('shows text-line skeletons in place of the About until the publish step is confirmed', () => {
    const steps = { profiles: 't1', vault: 't2', interview: null, publish: null };
    render(<OnboardingProgressContext.Provider value={research({ steps })}><HeroSection imageUrl="/small.jpg" artistName="Nova" artistId="a1" bio="Music from Miami." /></OnboardingProgressContext.Provider>);
    const status = screen.getByRole('status', { name: 'writing your about…' });
    expect(status.querySelectorAll('[data-skeleton=line]')).toHaveLength(3);
    expect(screen.queryByText('Music from Miami.')).toBeNull();
  });

  it('marks the About as new when it arrives', () => {
    const steps = { profiles: 'a', vault: 'b', interview: 'c', publish: 'c' };
    render(<OnboardingProgressContext.Provider value={research({ steps, fresh: { profiles: false, vault: false, publish: true } })}><HeroSection imageUrl="/small.jpg" artistName="Nova" artistId="a1" bio="Music from Miami." /></OnboardingProgressContext.Provider>);
    expect(screen.getByText('New About')).toBeInTheDocument();
    expect(screen.getByText('Music from Miami.')).toBeInTheDocument();
  });
});

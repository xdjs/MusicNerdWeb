/// <reference types="@testing-library/jest-dom" />
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HeroSection from '@/app/artist/[id]/_components/HeroSection';
import { EditModeContext } from '@/app/_components/EditModeContext';

function renderWith(isEditing: boolean) {
  return render(
    <EditModeContext.Provider value={{ isEditing, canEdit: true, toggle: jest.fn() }}>
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
    const { container } = renderWith(true);
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [new File(['image'], 'portrait.png', { type: 'image/png' })] } });
    await waitFor(() => expect(container.querySelector('[data-artist-portrait]')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith('/api/artist/profile-image', expect.objectContaining({ method: 'POST', body: expect.any(FormData) }));
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

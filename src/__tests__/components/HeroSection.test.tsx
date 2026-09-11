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
    const { container } = render(<HeroSection imageUrl="/portrait.jpg" artistName="Nova" artistId="a1" hasPortrait bio="Music from Miami." listenUrl="https://www.deezer.com/artist/123" />);
    expect(container.querySelector('[data-artist-portrait]')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Nova' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Listen/ })).toHaveAttribute('href', 'https://www.deezer.com/artist/123');
    expect(screen.getByRole('link', { name: 'Read the story' })).toHaveAttribute('href', '#mn-about');
  });
  it('keeps a thumbnail treatment without a custom portrait or invented Listen link', () => {
    const { container } = render(<HeroSection imageUrl="/small.jpg" artistName="Nova" artistId="a1" />);
    expect(container.querySelector('[data-artist-fallback]')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Listen/ })).not.toBeInTheDocument();
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

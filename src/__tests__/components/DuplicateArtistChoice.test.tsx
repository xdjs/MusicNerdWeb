import { fireEvent, render, screen, within } from '@testing-library/react';
import DuplicateArtistChoice from '@/app/_components/DuplicateArtistChoice';

const props = {
    candidates: [{ id: 'saved', name: 'Jamie Duffy', spotify: '2yvguoW65iZdUhca8yIfIo', deezer: null, imageUrl: 'https://example.com/saved.jpg' }],
    platform: 'deezer' as const,
    platformId: '279207961',
    selectedArtist: { name: 'Jamie Duffy', imageUrl: 'https://example.com/selected.jpg' },
    isCreatingSeparate: false,
    onCreateSeparate: jest.fn(),
    onCancel: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

it('separates the selected catalog profile from the saved artist and links to their actual providers', () => {
    render(<DuplicateArtistChoice {...props} />);
    const selected = screen.getByRole('group', { name: 'You selected' });
    const saved = screen.getByRole('group', { name: 'Already on Music Nerd' });
    expect(within(selected).getByRole('img')).toHaveAttribute('src', props.selectedArtist.imageUrl);
    expect(within(saved).getByRole('img')).toHaveAttribute('src', props.candidates[0].imageUrl);
    expect(within(selected).getByRole('link', { name: /Deezer/ })).toHaveAttribute('href', 'https://www.deezer.com/artist/279207961');
    expect(within(saved).getByRole('link', { name: /Spotify/ })).toHaveAttribute('href', 'https://open.spotify.com/artist/2yvguoW65iZdUhca8yIfIo');
    expect(screen.getByRole('link', { name: /Use existing profile: Jamie Duffy/ })).toHaveAttribute('href', '/artist/saved?addLink=https%3A%2F%2Fwww.deezer.com%2Fartist%2F279207961');
    expect(screen.getByText(/Review the link on that profile before adding it/)).toBeInTheDocument();
    expect(screen.queryByText('279207961')).not.toBeInTheDocument();
});

it('offers explicit separate creation and a back action without adding anything automatically', () => {
    render(<DuplicateArtistChoice {...props} />);
    expect(props.onCreateSeparate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Add different artist' }));
    expect(props.onCreateSeparate).toHaveBeenCalledTimes(1);
});

it('does not offer a separate record for a verified reciprocal match', () => {
    render(<DuplicateArtistChoice {...props} canCreateSeparate={false} message="Wikidata links these profiles to the same artist." />);
    expect(screen.queryByRole('button', { name: 'Add different artist' })).not.toBeInTheDocument();
    expect(screen.getByText('Wikidata links these profiles to the same artist.')).toBeInTheDocument();
});

it('removes navigation and cancel actions while creation is pending', () => {
    render(<DuplicateArtistChoice {...props} isCreatingSeparate />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('does not invent images when none were returned, and rejects an invalid submitted identity', () => {
    const { rerender } = render(<DuplicateArtistChoice {...props} selectedArtist={{ name: 'Jamie Duffy' }} candidates={[{ ...props.candidates[0], imageUrl: null }]} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    rerender(<DuplicateArtistChoice {...props} platformId="not-a-deezer-id" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

import { canonicalizeDestinationUrl } from '../canonicalizeDestinationUrl';

it('does not merge the two distinct website pages recorded in the Tim/Skipless walkthrough', () => {
    expect(canonicalizeDestinationUrl('https://theelliscourt.com/')).not.toBe(
        canonicalizeDestinationUrl('https://theelliscourt.com/whats-the-ellis-court-2/'),
    );
});

it('matches equivalent homepage serialization without changing navigation semantics', () => {
    expect(canonicalizeDestinationUrl('https://THEELLISCOURT.com:443')).toBe(
        canonicalizeDestinationUrl('https://theelliscourt.com/'),
    );
});

it.each(['https://artist.example/#/music', 'https://artist.example/?page=music', 'https://artist.example/Music'])('preserves distinct destination semantics for %s', url => {
    expect(canonicalizeDestinationUrl(url)).toBe(url);
});

import { isLinkTarget } from '@/lib/isLinkTarget';

// Keeps the wallet and ENS rows out of the "Supported links" picker by site name.
// The live urlmap row is `wallet`; `wallets` is the spelling artistLinkService and
// AddArtistData's display filter use, so both are excluded.
it.each([
    ['wallet', false],
    ['wallets', false],
    ['ens', false],
    ['inprocess', true],
    ['bandcamp', true],
    ['spotify', true],
])('isLinkTarget({ siteName: %p }) → %p', (siteName, expected) => {
    expect(isLinkTarget({ siteName })).toBe(expected);
});

import { momentUrl } from '@/lib/momentUrl';

const ARTIST_URL = 'https://www.inprocess.world/0x1f8dadb40c2cdb0d6d281add31c76e14f8ba6a91';

describe('momentUrl', () => {
    it('builds the In Process collect URL for a known chain', () => {
        expect(momentUrl(8453, '0xabc', '75', ARTIST_URL)).toBe('https://www.inprocess.world/collect/base:0xabc/75');
    });
    it('falls back to the artist profile for an unknown chain', () => {
        expect(momentUrl(999999, '0xabc', '75', ARTIST_URL)).toBe(ARTIST_URL);
        expect(momentUrl(null, '0xabc', '75', ARTIST_URL)).toBe(ARTIST_URL);
    });
});

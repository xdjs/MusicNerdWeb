import { extractInProcessAddress, fetchableUrl, momentKind, momentUrl, normalizeMoment, type RawTimelineMoment } from '@/lib/inprocessTimeline';

const ARTIST = '0x1f8dadb40c2cdb0d6d281add31c76e14f8ba6a91';
const ARTIST_URL = `https://www.inprocess.world/${ARTIST}`;

// Trimmed from the live response for Dutchyyy on 2026-09-13. The creator address
// differs from the profile address the timeline was fetched for; that is normal.
function raw(overrides: Partial<RawTimelineMoment> = {}): RawTimelineMoment {
    return {
        id: 'a04b2285-fd7a-4159-a59d-bf1f4348cc6d',
        address: '0xbfaab156f4d1d7b4f5a3b1f0f5b7a2c3d4e5f607',
        token_id: '75',
        chain_id: 8453,
        created_at: '2026-09-09T13:08:00+00:00',
        hidden: [],
        collection: { name: 'Two Human Hands' },
        metadata: {
            name: 'Two Human Hands (VISUAL EP) [V.1]',
            image: 'ar://Fi_4NsH2u8UpMScJc0q1U_0qy35q5EVEif5unP3ALcE',
            content: { mime: 'video/mp4' },
        },
        ...overrides,
    };
}

describe('extractInProcessAddress', () => {
    it.each([
        [`https://www.inprocess.world/${ARTIST}`, ARTIST],
        [`http://inprocess.world/${ARTIST.toUpperCase().replace('0X', '0x')}/?ref=x#top`, ARTIST],
        [' https://www.inprocess.world/0x1f8dadb40c2cdb0d6d281add31c76e14f8ba6a91 ', ARTIST],
        ['https://www.inprocess.world/0x1f8d', null],
        ['https://www.inprocess.world/collect/base:0xabc/1', null],
        ['https://example.com/0x1f8dadb40c2cdb0d6d281add31c76e14f8ba6a91', null],
        ['', null],
        [null, null],
        [undefined, null],
    ])('%p → %p', (input, expected) => {
        expect(extractInProcessAddress(input)).toBe(expected);
    });
});

describe('fetchableUrl', () => {
    it('resolves ar:// through the Arweave gateway', () => {
        expect(fetchableUrl('ar://Fi_4NsH2u8UpMScJc0q1U_0qy35q5EVEif5unP3ALcE')).toBe('https://arweave.net/Fi_4NsH2u8UpMScJc0q1U_0qy35q5EVEif5unP3ALcE');
    });
    it('resolves ipfs:// through the IPFS gateway', () => {
        expect(fetchableUrl('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')).toBe('https://magic.decentralized-content.com/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi');
    });
    it('keeps https as is and rejects the rest', () => {
        const https = 'https://zzgteesackezhtnuqfyw.supabase.co/storage/v1/object/public/in_process_files/5eb5ed3a';
        expect(fetchableUrl(https)).toBe(https);
        expect(fetchableUrl('http://insecure.example/a.png')).toBeNull();
        expect(fetchableUrl('ar://undefined')).toBeNull();
        expect(fetchableUrl('ar://')).toBeNull();
        expect(fetchableUrl('data:image/png;base64,AAAA')).toBeNull();
        expect(fetchableUrl(null)).toBeNull();
        expect(fetchableUrl('')).toBeNull();
    });
});

describe('momentKind', () => {
    it.each([
        ['video/mp4', 'video'],
        ['video/quicktime', 'video'],
        ['audio/mpeg', 'audio'],
        ['image/png', 'image'],
        ['IMAGE/JPEG', 'image'],
        ['application/pdf', 'writing'],
        ['text/plain', 'writing'],
        ['application/zip', 'other'],
        [null, 'other'],
        [undefined, 'other'],
    ])('%p → %p', (mime, expected) => {
        expect(momentKind(mime)).toBe(expected);
    });
});

describe('momentUrl', () => {
    it('builds the In Process collect URL for a known chain', () => {
        expect(momentUrl(8453, '0xabc', '75', ARTIST_URL)).toBe('https://www.inprocess.world/collect/base:0xabc/75');
    });
    it('falls back to the artist profile for an unknown chain', () => {
        expect(momentUrl(999999, '0xabc', '75', ARTIST_URL)).toBe(ARTIST_URL);
        expect(momentUrl(null, '0xabc', '75', ARTIST_URL)).toBe(ARTIST_URL);
    });
});

describe('normalizeMoment', () => {
    it('maps a live-shaped moment', () => {
        expect(normalizeMoment(raw(), ARTIST, ARTIST_URL)).toEqual({
            id: 'a04b2285-fd7a-4159-a59d-bf1f4348cc6d',
            title: 'Two Human Hands (VISUAL EP) [V.1]',
            kind: 'video',
            imageUrl: 'https://arweave.net/Fi_4NsH2u8UpMScJc0q1U_0qy35q5EVEif5unP3ALcE',
            createdAt: '2026-09-09T13:08:00+00:00',
            url: 'https://www.inprocess.world/collect/base:0xbfaab156f4d1d7b4f5a3b1f0f5b7a2c3d4e5f607/75',
        });
    });

    it('accepts a numeric token id and falls back to the collection name', () => {
        const moment = normalizeMoment(raw({ token_id: 7, metadata: { image: null, content: null } }), ARTIST, ARTIST_URL);
        expect(moment).toMatchObject({ title: 'Two Human Hands', kind: 'other', imageUrl: null });
        expect(moment?.url.endsWith('/7')).toBe(true);
    });

    it('uses a placeholder title when nothing names the moment', () => {
        expect(normalizeMoment(raw({ collection: null, metadata: null }), ARTIST, ARTIST_URL)?.title).toBe('Untitled moment');
    });

    it('skips moments the artist has hidden, case-insensitively', () => {
        expect(normalizeMoment(raw({ hidden: [ARTIST.toUpperCase().replace('0X', '0x')] }), ARTIST, ARTIST_URL)).toBeNull();
        expect(normalizeMoment(raw({ hidden: ['0x0000000000000000000000000000000000000000'] }), ARTIST, ARTIST_URL)).not.toBeNull();
    });

    it('rejects items missing an id, date, address or token', () => {
        expect(normalizeMoment(raw({ id: undefined }), ARTIST, ARTIST_URL)).toBeNull();
        expect(normalizeMoment(raw({ created_at: '' }), ARTIST, ARTIST_URL)).toBeNull();
        expect(normalizeMoment(raw({ address: null as unknown as string }), ARTIST, ARTIST_URL)).toBeNull();
        expect(normalizeMoment(raw({ token_id: null }), ARTIST, ARTIST_URL)).toBeNull();
    });
});

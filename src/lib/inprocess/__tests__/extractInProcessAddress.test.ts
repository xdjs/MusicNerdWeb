import { extractInProcessAddress } from '@/lib/inprocess/extractInProcessAddress';

const ARTIST = '0x1f8dadb40c2cdb0d6d281add31c76e14f8ba6a91';

describe('extractInProcessAddress', () => {
    it.each([
        // artists.inprocess holds the urlmap capture group: the bare address.
        [ARTIST, ARTIST],
        [` ${ARTIST.toUpperCase().replace('0X', '0x')} `, ARTIST],
        [`https://www.inprocess.world/${ARTIST}`, ARTIST],
        [`http://inprocess.world/${ARTIST.toUpperCase().replace('0X', '0x')}/?ref=x#top`, ARTIST],
        [' https://www.inprocess.world/0x1f8dadb40c2cdb0d6d281add31c76e14f8ba6a91 ', ARTIST],
        ['https://www.inprocess.world/0x1f8d', null],
        ['0x1f8d', null],
        ['1f8dadb40c2cdb0d6d281add31c76e14f8ba6a91', null],
        ['https://www.inprocess.world/collect/base:0xabc/1', null],
        ['https://example.com/0x1f8dadb40c2cdb0d6d281add31c76e14f8ba6a91', null],
        ['', null],
        [null, null],
        [undefined, null],
    ])('%p → %p', (input, expected) => {
        expect(extractInProcessAddress(input)).toBe(expected);
    });
});

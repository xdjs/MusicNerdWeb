import { inProcessProfileUrl } from '@/lib/inprocess/inProcessProfileUrl';

const ARTIST = '0x1f8dadb40c2cdb0d6d281add31c76e14f8ba6a91';

describe('inProcessProfileUrl', () => {
    it('matches the Links grid shape', () => {
        expect(inProcessProfileUrl(ARTIST)).toBe(`https://www.inprocess.world/${ARTIST}`);
    });
});

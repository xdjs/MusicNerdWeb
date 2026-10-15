import { addArtistStep } from '@/lib/analytics/addArtistStep';

describe('addArtistStep', () => {
    it('names how an add resolved', () => {
        expect(addArtistStep({ status: 'success' })).toBe('added');
        expect(addArtistStep({ status: 'exists' })).toBe('exists');
        expect(addArtistStep({ status: 'conflict' } as never)).toBe('error');
        expect(addArtistStep({ status: 'error' })).toBe('error');
    });

    it('waits on a possible duplicate: the visitor still has to choose', () => {
        expect(addArtistStep({ status: 'possible_duplicate' } as never)).toBeNull();
    });
});

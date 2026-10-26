// @ts-nocheck
import { jest } from '@jest/globals';
import {
    confirmOnboardingStep,
    upsertArtistDoc,
} from '@/server/utils/queries/onboardingQueries';
import { db } from '@/server/db/drizzle';

describe('write paths use ON CONFLICT upserts', () => {
    beforeEach(() => jest.clearAllMocks());

    it('confirmOnboardingStep is idempotent via onConflictDoNothing', async () => {
        const onConflictDoNothing = jest.fn().mockResolvedValue(undefined);
        db.insert.mockReturnValue({ values: jest.fn().mockReturnValue({ onConflictDoNothing }) });
        await confirmOnboardingStep('artist-1', 'profiles');
        expect(onConflictDoNothing).toHaveBeenCalled();
    });

    it('upsertArtistDoc upserts on artistId', async () => {
        const onConflictDoUpdate = jest.fn().mockResolvedValue(undefined);
        db.insert.mockReturnValue({ values: jest.fn().mockReturnValue({ onConflictDoUpdate }) });
        await upsertArtistDoc('artist-1', '# doc');
        expect(onConflictDoUpdate).toHaveBeenCalled();
    });
});

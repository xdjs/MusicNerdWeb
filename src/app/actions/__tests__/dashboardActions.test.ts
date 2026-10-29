// @ts-nocheck
import { jest } from "@jest/globals";
jest.mock('@/server/utils/queries/lorePersistence', () => ({ getLoreClaimGeneration: jest.fn().mockResolvedValue('claim-1') }));

jest.mock('@/server/utils/linkPreview', () => ({ fetchLinkPreview: jest.fn().mockResolvedValue({title:'Article title',imageUrl:null}) }));

jest.mock("@/server/auth", () => ({
    getServerAuthSession: jest.fn(),
}));
jest.mock("@/server/utils/dev-auth", () => ({
    getDevSession: jest.fn().mockResolvedValue(null),
}));
jest.mock("@/server/utils/queries/userQueries", () => ({
    getUserById: jest.fn(),
}));
jest.mock("@/server/utils/queries/dashboardQueries", () => ({
    createClaim: jest.fn(),
    getVaultSourceById: jest.fn(),
    getClaimByArtistId: jest.fn(),
    getApprovedClaimByUserId: jest.fn(),
    getApprovedClaimForArtistByUserId: jest.fn(),
    getVaultSourcesByArtistId: jest.fn().mockResolvedValue([]),
    getVaultSourceByIdAndArtist: jest.fn(),
    updateVaultSourceStatus: jest.fn(),
    updateVaultSourceType: jest.fn(),
    seedMockVaultSources: jest.fn(),
    insertVaultSource: jest.fn(),
    deleteVaultSource: jest.fn(),
    deleteVaultSources: jest.fn(),
    deleteClaim: jest.fn(),
    updateVaultSourceContent: jest.fn().mockResolvedValue(undefined),
    getBioVersionsByArtistId: jest.fn(),
    saveBioVersion: jest.fn(),
    pinBioVersion: jest.fn(),
    deleteBioVersion: jest.fn(),
    unpinArtistBio: jest.fn(),
}));
jest.mock("@/server/utils/queries/vaultWebSearch", () => ({
    searchAndPopulateVault: jest.fn().mockResolvedValue(0),
}));
jest.mock("@/server/utils/queries/artistBioQuery", () => ({
    generateArtistBio: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/server/utils/queries/loreRefresh", () => ({
    queueLoreRefresh: jest.fn().mockResolvedValue("rebuilt"),
}));
jest.mock("@/server/utils/queries/discord", () => ({
    sendDiscordMessage: jest.fn().mockResolvedValue(undefined),
}));
// Keep the real isUnsafeUrl implementation — stub only the fire-and-forget fetch.
jest.mock("@/server/utils/fetchPageContent", () => {
    const actual = jest.requireActual("@/server/utils/fetchPageContent");
    return {
        ...actual,
        fetchPageContent: jest.fn().mockResolvedValue({ title: "mock", snippet: undefined, extractedText: null }),
    };
});

describe('bio actions pass original ownership to the locked mutation', () => {
    beforeEach(() => jest.resetModules());
    async function setup() {
        const auth = await import('@/server/auth');
        const dq = await import('@/server/utils/queries/dashboardQueries');
        const generation = await import('@/server/utils/queries/lorePersistence');
        const actions = await import('../dashboardActions');
        auth.getServerAuthSession.mockResolvedValue({ user: { id: 'owner' } });
        dq.getApprovedClaimForArtistByUserId.mockResolvedValue({ id: 'claim-1', artistId: 'a1', userId: 'owner' });
        dq.getApprovedClaimByUserId.mockResolvedValue({ id: 'claim-1', artistId: 'a1', userId: 'owner' });
        dq.pinBioVersion.mockResolvedValue({ id: 'v1' });
        dq.deleteBioVersion.mockResolvedValue({ id: 'v1' });
        return { actions, dq, generation };
    }
    it.each([true, false])('threads identity and generation for save/pin/delete (explicit artist: %s)', async explicit => {
        const { actions, dq } = await setup();
        const artist = explicit ? 'a1' : undefined;
        const expected = { userId: 'owner', expectedClaimId: 'claim-1' };
        expect((await actions.saveCurrentBio('Saved text', artist)).success).toBe(true);
        expect((await actions.pinBioVersionAction('v1', artist)).success).toBe(true);
        expect((await actions.deleteBioVersionAction('v1', artist)).success).toBe(true);
        expect(dq.saveBioVersion).toHaveBeenCalledWith('a1', 'Saved text', expected);
        expect(dq.pinBioVersion).toHaveBeenCalledWith('v1', 'a1', expected);
        expect(dq.deleteBioVersion).toHaveBeenCalledWith('v1', 'a1', expected);
    });
    it('captures generation before authorization and does not report a revoked unpin as success', async () => {
        const { actions, dq, generation } = await setup();
        dq.unpinArtistBio.mockRejectedValue(new Error('Artist ownership changed'));
        expect((await actions.unpinBioAction('a1')).success).toBe(false);
        expect(dq.unpinArtistBio).toHaveBeenCalledWith('a1', { userId: 'owner', expectedClaimId: 'claim-1' });
        expect(generation.getLoreClaimGeneration.mock.invocationCallOrder[0])
            .toBeLessThan(dq.getApprovedClaimForArtistByUserId.mock.invocationCallOrder[0]);
    });
});

// Migration 0007 / partial unique index on artist_claims: a rejected claim no longer
// blocks a new claim (rejected claims persist for audit; only pending|approved are
// considered "active" by getClaimByArtistId).
describe("dashboardActions.claimArtistProfile", () => {
    beforeEach(() => {
        jest.resetModules();
    });

    async function setup() {
        const { getServerAuthSession } = await import("@/server/auth");
        const { getClaimByArtistId, createClaim } = await import("@/server/utils/queries/dashboardQueries");
        const { claimArtistProfile } = await import("../dashboardActions");

        (getServerAuthSession as jest.Mock).mockResolvedValue({ user: { id: "user-1", email: "user@test.com" } });

        return {
            claimArtistProfile,
            getClaimByArtistId: getClaimByArtistId as jest.Mock,
            createClaim: createClaim as jest.Mock,
        };
    }

    it("permits a new claim when no active claim exists (rejected-only or empty)", async () => {
        const { claimArtistProfile, getClaimByArtistId, createClaim } = await setup();
        // getClaimByArtistId is scoped to ACTIVE claims post-0007, so a row in
        // 'rejected' state surfaces as undefined here — identical to "no claim."
        getClaimByArtistId.mockResolvedValue(undefined);
        createClaim.mockResolvedValue({ id: "claim-new", referenceCode: "MN-NEW" });

        const result = await claimArtistProfile("artist-1");

        expect(result.success).toBe(true);
        expect(result.alreadyClaimed).toBeUndefined();
        expect(createClaim).toHaveBeenCalledTimes(1);
    });

    it("blocks a new claim when an active (pending) claim exists", async () => {
        const { claimArtistProfile, getClaimByArtistId, createClaim } = await setup();
        getClaimByArtistId.mockResolvedValue({ id: "claim-existing", status: "pending" });

        const result = await claimArtistProfile("artist-1");

        expect(result.success).toBe(false);
        expect(result.alreadyClaimed).toBe(true);
        expect(createClaim).not.toHaveBeenCalled();
    });

    it("blocks a new claim when an active (approved) claim exists", async () => {
        const { claimArtistProfile, getClaimByArtistId, createClaim } = await setup();
        getClaimByArtistId.mockResolvedValue({ id: "claim-existing", status: "approved" });

        const result = await claimArtistProfile("artist-1");

        expect(result.success).toBe(false);
        expect(result.alreadyClaimed).toBe(true);
        expect(createClaim).not.toHaveBeenCalled();
    });
});


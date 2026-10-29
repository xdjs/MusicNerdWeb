// @ts-nocheck
import { jest } from '@jest/globals';
jest.mock('@/server/utils/queries/lorePersistence', () => ({ getLoreClaimGeneration: jest.fn().mockResolvedValue('claim-1') }));

jest.mock('@/server/utils/privy', () => ({ verifyPrivyToken: jest.fn() }));
jest.mock('@/server/utils/queries/userQueries', () => ({ getUserById: jest.fn(), getUserByPrivyId: jest.fn() }));
jest.mock('@/server/utils/queries/dashboardQueries', () => ({
  getApprovedClaimForArtistByUserId: jest.fn(),
  getVaultSourceById: jest.fn(),
  getVaultSourcesByArtistId: jest.fn(),
  updateVaultSourceStatus: jest.fn(),
  insertVaultSource: jest.fn(),
  deleteVaultSource: jest.fn(),
  deleteVaultSources: jest.fn(),
  updateVaultSourceType: jest.fn(),
  updateVaultSourceContent: jest.fn(),
  getBioVersionsByArtistId: jest.fn(),
  saveBioVersion: jest.fn(),
  pinBioVersion: jest.fn(),
  deleteBioVersion: jest.fn(),
}));
jest.mock('@/server/utils/queries/vaultWebSearch', () => ({ searchAndPopulateVault: jest.fn() }));
jest.mock('@/server/utils/queries/artistBioQuery', () => ({ generateArtistBio: jest.fn() }));
jest.mock('@/server/utils/fetchPageContent', () => ({ fetchPageContent: jest.fn() }));
jest.mock('@/server/utils/queries/discord', () => ({ sendDiscordMessage: jest.fn() }));

describe('vault action authorization', () => {
  beforeEach(() => { jest.resetModules(); jest.clearAllMocks(); });

  async function setup() {
    const privy = await import('@/server/utils/privy');
    const users = await import('@/server/utils/queries/userQueries');
    const q = await import('@/server/utils/queries/dashboardQueries');
    const actions = await import('../dashboardActions');
    (privy.verifyPrivyToken as jest.Mock).mockImplementation(async token => token === 'admin-token' ? { userId: 'did:privy:admin' } : null);
    (users.getUserByPrivyId as jest.Mock).mockImplementation(async id => id === 'did:privy:admin' ? { id: 'admin-1' } : null);
    return { actions, users, q };
  }

  it('admin can searchWebForSources for an artist they do not own', async () => {
    const { actions, users } = await setup();
    const { searchAndPopulateVault } = await import('@/server/utils/queries/vaultWebSearch');
    (users.getUserById as jest.Mock).mockResolvedValue({ id: 'admin-1', isAdmin: true });
    (searchAndPopulateVault as jest.Mock).mockResolvedValue(3);

    const res = await actions.searchWebForSources('artist-they-dont-own', 'admin-token');

    expect(res.success).toBe(true);
    expect(searchAndPopulateVault).toHaveBeenCalledWith('artist-they-dont-own', { ownership: { userId: 'admin-1', expectedClaimId: 'claim-1', trigger: 'editor_search' } });
  });

  it.each([['no token', null], ['an unverified token', 'bad-token']])('refuses a search with %s', async (_label, token) => {
    const { actions } = await setup();
    const { searchAndPopulateVault } = await import('@/server/utils/queries/vaultWebSearch');
    expect(await actions.searchWebForSources('artist-1', token)).toEqual({ success: false, error: 'Not authenticated' });
    expect(searchAndPopulateVault).not.toHaveBeenCalled();
  });

  it('refuses a signed-in caller who cannot edit the artist', async () => {
    const { actions, users, q } = await setup();
    const { searchAndPopulateVault } = await import('@/server/utils/queries/vaultWebSearch');
    (users.getUserById as jest.Mock).mockResolvedValue({ id: 'admin-1', isAdmin: false });
    (q.getApprovedClaimForArtistByUserId as jest.Mock).mockResolvedValue(undefined);
    expect(await actions.searchWebForSources('artist-1', 'admin-token')).toEqual({ success: false, error: 'Not authorized for this artist' });
    expect(searchAndPopulateVault).not.toHaveBeenCalled();
  });

});

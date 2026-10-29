// @ts-nocheck
import { jest } from '@jest/globals';
jest.mock('@/server/utils/queries/lorePersistence', () => ({ getLoreClaimGeneration: jest.fn().mockResolvedValue('claim-1') }));

jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('@/server/utils/dev-auth', () => ({ getDevSession: jest.fn() }));
jest.mock('@/server/utils/queries/userQueries', () => ({ getUserById: jest.fn() }));
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
    const auth = await import('@/server/auth');
    const users = await import('@/server/utils/queries/userQueries');
    const q = await import('@/server/utils/queries/dashboardQueries');
    const actions = await import('../dashboardActions');
    (auth.getServerAuthSession as jest.Mock).mockResolvedValue({ user: { id: 'admin-1' } });
    return { actions, users, q };
  }

  it('admin can searchWebForSources for an artist they do not own', async () => {
    const { actions, users } = await setup();
    const { searchAndPopulateVault } = await import('@/server/utils/queries/vaultWebSearch');
    (users.getUserById as jest.Mock).mockResolvedValue({ id: 'admin-1', isAdmin: true });
    (searchAndPopulateVault as jest.Mock).mockResolvedValue(3);

    const res = await actions.searchWebForSources('artist-they-dont-own');

    expect(res.success).toBe(true);
    expect(searchAndPopulateVault).toHaveBeenCalledWith('artist-they-dont-own', { ownership: { userId: 'admin-1', expectedClaimId: 'claim-1', trigger: 'editor_search' } });
  });

});

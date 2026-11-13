// @ts-nocheck
import { jest } from '@jest/globals';

jest.unmock('@/app/actions/serverActions');
jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('@/server/utils/queries/artistQueries', () => ({
  approveUgcAdmin: jest.fn(),
  addArtistData: jest.fn(),
}));
jest.mock('@/server/utils/queries/userQueries', () => ({
  getUserById: jest.fn(),
  searchForUsersByWallet: jest.fn().mockResolvedValue(['0xabc']),
  addUsersToWhitelist: jest.fn().mockResolvedValue({ status: 'success', message: 'ok' }),
  removeFromWhitelist: jest.fn().mockResolvedValue(undefined),
  addUsersToAdmin: jest.fn().mockResolvedValue({ status: 'success', message: 'ok' }),
  removeFromAdmin: jest.fn().mockResolvedValue(undefined),
  addUsersToHidden: jest.fn().mockResolvedValue({ status: 'success', message: 'ok' }),
  removeFromHidden: jest.fn().mockResolvedValue(undefined),
}));

// Polyfill Response.json for the test environment (as in auth-helpers.test.ts)
if (!('json' in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      status: init?.status || 200,
    });
}

const cases = [
  ['searchForUsersByWalletAction', 'searchForUsersByWallet', '0xa'],
  ['addUsersToWhitelistAction', 'addUsersToWhitelist', ['0xabc']],
  ['removeFromWhitelistAction', 'removeFromWhitelist', ['user-2']],
  ['addUsersToAdminAction', 'addUsersToAdmin', ['0xabc']],
  ['removeFromAdminAction', 'removeFromAdmin', ['user-2']],
  ['addUsersToHiddenAction', 'addUsersToHidden', ['0xabc']],
  ['removeFromHiddenAction', 'removeFromHidden', ['user-2']],
] as const;

describe('user-management actions require an admin', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  async function setup(session, dbUser) {
    const auth = await import('@/server/auth');
    const users = await import('@/server/utils/queries/userQueries');
    const actions = await import('../serverActions');
    (auth.getServerAuthSession as jest.Mock).mockResolvedValue(session);
    (users.getUserById as jest.Mock).mockResolvedValue(dbUser);
    return { actions, users };
  }

  it.each(cases)('%s rejects a signed-out caller without a write', async (action, query, arg) => {
    const { actions, users } = await setup(null, undefined);
    await expect(actions[action](arg)).rejects.toThrow('Admin access required');
    expect(users[query]).not.toHaveBeenCalled();
  });

  it.each(cases)('%s rejects a signed-in non-admin without a write', async (action, query, arg) => {
    const { actions, users } = await setup({ user: { id: 'user-1' } }, { id: 'user-1', isAdmin: false });
    await expect(actions[action](arg)).rejects.toThrow('Admin access required');
    expect(users[query]).not.toHaveBeenCalled();
  });

  it.each(cases)('%s runs for an admin', async (action, query, arg) => {
    const { actions, users } = await setup({ user: { id: 'admin-1' } }, { id: 'admin-1', isAdmin: true });
    await actions[action](arg);
    expect(users[query]).toHaveBeenCalledWith(arg);
  });
});

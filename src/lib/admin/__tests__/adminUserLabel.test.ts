import { adminUserLabel } from '../adminUserLabel';

it('prefers the username, then the wallet, then the id', () => {
  expect(adminUserLabel({ id: 'u1', username: 'dutchyyy', wallet: '0xabc' })).toBe('dutchyyy');
  expect(adminUserLabel({ id: 'u1', username: null, wallet: '0xabc' })).toBe('0xabc');
  expect(adminUserLabel({ id: 'u1', username: null, wallet: null })).toBe('u1');
});

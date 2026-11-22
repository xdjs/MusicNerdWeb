import { signOut } from 'next-auth/react';
import { signOutEverywhere } from '../signOutEverywhere';

jest.mock('next-auth/react', () => ({ signOut: jest.fn() }));
beforeEach(() => jest.clearAllMocks());

it('ends the NextAuth session, then the Privy one', async () => {
  const order: string[] = [];
  (signOut as jest.Mock).mockImplementation(async () => { order.push('nextauth'); });
  const privyLogout = jest.fn(async () => { order.push('privy'); });
  await signOutEverywhere(privyLogout);
  expect(signOut).toHaveBeenCalledWith({ redirect: false });
  expect(order).toEqual(['nextauth', 'privy']);
});

it('stops before Privy when NextAuth fails', async () => {
  (signOut as jest.Mock).mockRejectedValue(new Error('offline'));
  const privyLogout = jest.fn();
  await expect(signOutEverywhere(privyLogout)).rejects.toThrow('offline');
  expect(privyLogout).not.toHaveBeenCalled();
});

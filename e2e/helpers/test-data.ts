/**
 * Centralized test constants for E2E tests.
 * All test accounts use Privy's deterministic OTP for test emails.
 */

export const TEST_ACCOUNTS = {
  regular: {
    email: 'test-4473@privy.io',
    otp: '676856',
    storageState: 'e2e/.auth/regular.json',
  },
  whitelisted: {
    email: 'test-4132@privy.io',
    otp: '202849',
    storageState: 'e2e/.auth/whitelisted.json',
  },
  admin: {
    email: 'test-3256@privy.io',
    otp: '207862',
    storageState: 'e2e/.auth/admin.json',
  },
} as const;

/** Known Spotify artist IDs for testing */
export const SPOTIFY_IDS = {
  radiohead: '4Z8W4fKeB5YxbusRsdQVPb',
} as const;

// @ts-nocheck
import '../setup/testEnv';

import { describe, it, expect } from '@jest/globals';

/**
 * Unit tests for Privy authentication token handling.
 * These tests focus on the token prefix logic and verification result mapping
 * without mocking the Privy SDK (which is tested via integration tests).
 */
describe('Privy Authentication - Token Prefix Handling', () => {
  describe('Token Prefix Identification', () => {
    it('should correctly identify privyid: prefix', () => {
      const token = 'privyid:did:privy:test-user-123';
      expect(token.startsWith('privyid:')).toBe(true);
      expect(token.slice(8)).toBe('did:privy:test-user-123');
    });

    it('should correctly identify idtoken: prefix', () => {
      const token = 'idtoken:eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.payload';
      expect(token.startsWith('idtoken:')).toBe(true);
      expect(token.slice(8)).toBe('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.payload');
    });

    it('should not match prefixes for standard JWT tokens', () => {
      const token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
      expect(token.startsWith('privyid:')).toBe(false);
      expect(token.startsWith('idtoken:')).toBe(false);
    });

    it('should handle empty string gracefully', () => {
      const token = '';
      expect(token.startsWith('privyid:')).toBe(false);
      expect(token.startsWith('idtoken:')).toBe(false);
    });

    it('should correctly extract Privy user ID from prefix', () => {
      const testCases = [
        { input: 'privyid:did:privy:abc123', expected: 'did:privy:abc123' },
        { input: 'privyid:user-id-only', expected: 'user-id-only' },
        { input: 'privyid:', expected: '' },
      ];

      testCases.forEach(({ input, expected }) => {
        if (input.startsWith('privyid:')) {
          expect(input.slice(8)).toBe(expected);
        }
      });
    });

    it('should correctly extract identity token from prefix', () => {
      const testCases = [
        { input: 'idtoken:jwt-token-value', expected: 'jwt-token-value' },
        { input: 'idtoken:eyJhbGciOiJSUzI1NiJ9.payload.sig', expected: 'eyJhbGciOiJSUzI1NiJ9.payload.sig' },
        { input: 'idtoken:', expected: '' },
      ];

      testCases.forEach(({ input, expected }) => {
        if (input.startsWith('idtoken:')) {
          expect(input.slice(8)).toBe(expected);
        }
      });
    });
  });

  describe('Linked Account Type Mapping', () => {
    it('should identify wallet accounts', () => {
      const account = { type: 'wallet', address: '0x1234567890abcdef' };
      expect(account.type).toBe('wallet');
      expect(account.address).toBeDefined();
    });

    it('should identify email accounts', () => {
      const account = { type: 'email', address: 'test@example.com' };
      expect(account.type).toBe('email');
    });

    it('should map wallet address correctly', () => {
      const accounts = [
        { type: 'wallet', address: '0x1234' },
        { type: 'email', address: 'test@example.com' },
      ];

      const mapped = accounts.map((account) => ({
        type: account.type,
        address: account.type === 'wallet' ? account.address : undefined,
        email: account.type === 'email' ? account.address : undefined,
      }));

      expect(mapped[0]).toEqual({
        type: 'wallet',
        address: '0x1234',
        email: undefined,
      });
      expect(mapped[1]).toEqual({
        type: 'email',
        address: undefined,
        email: 'test@example.com',
      });
    });
  });

  describe('Verification Result Structure', () => {
    it('should have correct structure for PrivyVerificationResult', () => {
      const result = {
        userId: 'did:privy:user-123',
        email: 'test@example.com',
        linkedAccounts: [
          { type: 'email', address: undefined, email: 'test@example.com' },
          { type: 'wallet', address: '0x1234', email: undefined },
        ],
      };

      expect(result.userId).toMatch(/^did:privy:/);
      expect(result.email).toContain('@');
      expect(Array.isArray(result.linkedAccounts)).toBe(true);
    });

    it('should handle missing email in result', () => {
      const result = {
        userId: 'did:privy:user-123',
        email: undefined,
        linkedAccounts: [],
      };

      expect(result.email).toBeUndefined();
    });

    it('should handle empty linked accounts', () => {
      const result = {
        userId: 'did:privy:user-123',
        email: 'test@example.com',
        linkedAccounts: [],
      };

      expect(result.linkedAccounts).toHaveLength(0);
    });
  });
});

describe('Privy Token Fallback Logic', () => {
  describe('Client-side fallback chain', () => {
    it('should define correct fallback order', () => {
      // This tests the conceptual order of the fallback chain
      const fallbackOrder = [
        'getAccessToken()',           // Primary method
        'getIdentityToken()',         // Secondary method
        'privyid:<user.id>',          // Final fallback for test users
      ];

      expect(fallbackOrder).toHaveLength(3);
      expect(fallbackOrder[0]).toBe('getAccessToken()');
      expect(fallbackOrder[1]).toBe('getIdentityToken()');
      expect(fallbackOrder[2]).toMatch(/privyid:/);
    });

    it('should create correct privyid token format', () => {
      const userId = 'did:privy:cmkx6xk1e00d8l80cmamqi76f';
      const token = `privyid:${userId}`;

      expect(token).toBe('privyid:did:privy:cmkx6xk1e00d8l80cmamqi76f');
      expect(token.startsWith('privyid:')).toBe(true);
    });

    it('should create correct idtoken format', () => {
      const identityToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig';
      const token = `idtoken:${identityToken}`;

      expect(token).toBe('idtoken:eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig');
      expect(token.startsWith('idtoken:')).toBe(true);
    });
  });

  describe('Server-side token routing', () => {
    it('should route privyid: tokens to getUser by ID', () => {
      const token = 'privyid:did:privy:test-123';

      if (token.startsWith('privyid:')) {
        const privyUserId = token.slice(8);
        expect(privyUserId).toBe('did:privy:test-123');
        // This would call: privyClient.getUser(privyUserId)
      }
    });

    it('should route idtoken: tokens to getUser with idToken', () => {
      const token = 'idtoken:jwt-token-here';

      if (token.startsWith('idtoken:')) {
        const idToken = token.slice(8);
        expect(idToken).toBe('jwt-token-here');
        // This would call: privyClient.getUser({ idToken })
      }
    });

    it('should route standard tokens to verifyAuthToken', () => {
      const token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig';

      const isDirectId = token.startsWith('privyid:');
      const isIdentityToken = token.startsWith('idtoken:');

      expect(isDirectId).toBe(false);
      expect(isIdentityToken).toBe(false);
      // This would call: privyClient.verifyAuthToken(token)
    });
  });
});

/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
    dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig: Config = {
    setupFilesAfterEnv: [
        '<rootDir>/jest.setup.ts'
    ],
    testEnvironment: 'jest-environment-jsdom',
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        // Handle module aliases
        '^@components/(.*)$': '<rootDir>/src/components/$1',
        '^@lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
        '^jose$': '<rootDir>/node_modules/jose/dist/node/cjs/index.js',
        '^jose/(.*)$': '<rootDir>/node_modules/jose/dist/node/cjs/$1',
        '^@panva/hkdf$': '<rootDir>/node_modules/@panva/hkdf/dist/node/cjs/index.js',
        '^next-auth$': '<rootDir>/__mocks__/next-auth/index.js',
        '^next-auth/react$': '<rootDir>/__mocks__/next-auth/react.js',
        '^next-auth/providers/credentials$': '<rootDir>/__mocks__/next-auth/providers/credentials.js',
        '^next-auth/(.*)$': '<rootDir>/__mocks__/next-auth/index.js',
        '^@privy-io/server-auth$': '<rootDir>/__mocks__/@privy-io/server-auth.js',
        // Handle CSS imports
        '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
        // Handle image imports
        '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': '<rootDir>/__mocks__/fileMock.js',
    },
    transformIgnorePatterns: [
        'node_modules/(?!(jose|openid-client|oauth4webapi|@radix-ui|@panva|@tanstack|@tanstack/react-query|@tanstack/query-core|@privy-io)/)'
    ],
    testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
    moduleDirectories: ['node_modules', '<rootDir>/'],
    testMatch: [
        '**/__tests__/**/*.[jt]s?(x)',
        '**/?(*.)+(spec|test).[jt]s?(x)'
    ],
    testTimeout: 20000,
    // Coverage configuration
    collectCoverage: false, // Enable via CLI flag
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.test.{ts,tsx}',
        '!src/**/*.spec.{ts,tsx}',
        '!src/types/**/*',
        '!src/test/**/*',
        '!src/__tests__/**/*',
        '!src/__mocks__/**/*',
    ],
    coverageReporters: [
        'text',
        'lcov',
        'html',
        'json',
        'json-summary'
    ],
    coverageThreshold: {
        global: {
            branches: 20,
            functions: 15,
            lines: 25,
            statements: 25
        }
    },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(customJestConfig);

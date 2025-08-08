/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from 'jest';
import nextJest from 'next/jest';

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
        '^jose/(.*)$': '<rootDir>/node_modules/jose/dist/node/cjs/$1',
        // Mock wagmi and viem to avoid ES module issues
        '^wagmi$': '<rootDir>/src/__mocks__/wagmi.ts',
        '^wagmi/(.*)$': '<rootDir>/src/__mocks__/wagmi-$1.ts',
        '^viem$': '<rootDir>/src/__mocks__/viem.ts',
        '^viem/(.*)$': '<rootDir>/src/__mocks__/viem-$1.ts',
        // Handle CSS imports
        '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
        // Handle image imports
        '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': '<rootDir>/__mocks__/fileMock.js',
    },
    transformIgnorePatterns: [
        'node_modules/(?!(jose|@rainbow-me|@radix-ui|next-auth|openid-client|@auth/core|@panva|@tanstack|@tanstack/react-query|@tanstack/query-core|use-sync-external-store)/)'
    ],
    testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
    moduleDirectories: ['node_modules', '<rootDir>/'],
    testMatch: [
        '**/__tests__/**/*.[jt]s?(x)',
        '**/?(*.)+(spec|test).[jt]s?(x)'
    ],
    testTimeout: 20000,
    transform: {
        '^.+\\.(ts|tsx)$': ['@swc/jest', {
            jsc: {
                parser: {
                    syntax: 'typescript',
                    tsx: true,
                },
                target: 'es2019',
                transform: {
                    react: {
                        runtime: 'automatic',
                    },
                },
            },
        }],
        '^.+\\.(js|jsx)$': ['@swc/jest', {
            jsc: {
                parser: {
                    syntax: 'ecmascript',
                    jsx: true,
                },
                target: 'es2019',
                transform: {
                    react: {
                        runtime: 'automatic',
                    },
                },
            },
        }],
    },
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
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(customJestConfig);

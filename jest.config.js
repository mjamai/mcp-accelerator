module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/__tests__/',
    '\\.test\\.ts$',
    '\\.d\\.ts$',
  ],
  projects: [
    {
      displayName: 'core',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/packages/core/**/*.test.ts'],
      collectCoverageFrom: [
        'packages/core/src/**/*.ts',
        '!packages/core/src/**/*.d.ts',
        '!packages/core/src/**/*.test.ts',
        '!packages/core/src/**/__tests__/**',
        '!packages/core/src/cli/**',
        '!packages/core/dist/**',
      ],
    },
    {
      displayName: 'middleware-auth',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/packages/middleware-auth/**/*.test.ts'],
      collectCoverageFrom: [
        'packages/middleware-auth/src/**/*.ts',
        '!packages/middleware-auth/src/**/*.d.ts',
      ],
    },
    {
      displayName: 'middleware-ratelimit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/packages/middleware-ratelimit/**/*.test.ts'],
      collectCoverageFrom: [
        'packages/middleware-ratelimit/src/**/*.ts',
        '!packages/middleware-ratelimit/src/**/*.d.ts',
      ],
    },
    {
      displayName: 'middleware-cors',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/packages/middleware-cors/**/*.test.ts'],
      collectCoverageFrom: [
        'packages/middleware-cors/src/**/*.ts',
        '!packages/middleware-cors/src/**/*.d.ts',
      ],
    },
    {
      displayName: 'middleware-resilience',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/packages/middleware-resilience/**/*.test.ts'],
      collectCoverageFrom: [
        'packages/middleware-resilience/src/**/*.ts',
        '!packages/middleware-resilience/src/**/*.d.ts',
      ],
    },
    {
      displayName: 'transport-http',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/packages/transport-http/**/*.test.ts'],
      collectCoverageFrom: [
        'packages/transport-http/src/**/*.ts',
        '!packages/transport-http/src/**/*.d.ts',
      ],
    },
    {
      displayName: 'transport-websocket',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/packages/transport-websocket/**/*.test.ts'],
      collectCoverageFrom: [
        'packages/transport-websocket/src/**/*.ts',
        '!packages/transport-websocket/src/**/*.d.ts',
      ],
    },
  ],
  coverageThreshold: {
    global: {
      branches: 48,
      functions: 45,
      lines: 60,
      statements: 59,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
};
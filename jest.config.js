module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
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
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
};
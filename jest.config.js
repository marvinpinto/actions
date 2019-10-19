module.exports = {
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  clearMocks: true,
  moduleFileExtensions: ['js', 'ts'],
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  testRunner: 'jest-circus/runner',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverage: true,
  projects: ['<rootDir>/packages/*/jest.config.js'],
  coverageReporters: ['text'],
  coverageThreshold: {
    global: {
      lines: 100,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.js'],
};

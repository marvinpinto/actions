// Mock out `core.debug` calls
const processStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (str, encoding, cb) => {
  if (!str.match(/^::/)) {
    return processStdoutWrite(str, encoding, cb);
  }
};

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
  verbose: true,
  collectCoverage: true,
  projects: ['<rootDir>/packages/*/jest.config.js'],
  coverageReporters: ['text'],
  coverageThreshold: {
    global: {
      lines: 100,
    },
  },
};

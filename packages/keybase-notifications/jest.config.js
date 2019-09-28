/* eslint-disable @typescript-eslint/no-var-requires */
const jestconfig = require('../../jest.config');
module.exports = {
  ...jestconfig,
  name: 'keybase-notifications',
  displayName: 'keybase-notifications',
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: ['<rootDir>/src/keybase.ts', '<rootDir>/src/index.ts', '<rootDir>/src/utils.ts'],
};

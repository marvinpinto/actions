/* eslint-disable @typescript-eslint/no-var-requires */
const jestconfig = require('../../jest.config');
module.exports = {
  ...jestconfig,
  name: 'automatic-releases',
  displayName: 'automatic-releases',
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: ['<rootDir>/src/index.ts'],
};

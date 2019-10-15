/* eslint-disable @typescript-eslint/no-var-requires */

describe('main handler', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws an error when "repo_token" is not supplied', async () => {
    const inst = require('../src/main');
    await expect(inst.main()).rejects.toThrow('Input required and not supplied: repo_token');
  });
});

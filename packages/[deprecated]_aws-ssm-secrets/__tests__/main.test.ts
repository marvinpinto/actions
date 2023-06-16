import * as core from '@actions/core';
import {mockGetParameter} from 'aws-sdk/clients/ssm';
import {main} from '../src/main';

describe('main handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['INPUT_SSM_PARAMETER'] = '/build-secrets/production/cloudflare-account-id';
    process.env['INPUT_ENV_VARIABLE_NAME'] = 'cloudflare_account_id';
  });

  afterEach(() => {
    delete process.env.INPUT_SSM_PARAMETER;
    delete process.env.INPUT_ENV_VARIABLE_NAME;
  });

  it('throws an error if any of the required parameters is not supplied', async () => {
    delete process.env.INPUT_SSM_PARAMETER;
    await expect(main()).rejects.toThrow('Input required and not supplied: ssm_parameter');
  });

  it('is able to successfully inject a secret as an environment variable', async () => {
    await main();

    expect(mockGetParameter).toHaveBeenCalledTimes(1);
    expect(mockGetParameter).toHaveBeenCalledWith({
      Name: '/build-secrets/production/cloudflare-account-id',
      WithDecryption: true,
    });

    expect(core.setSecret).toHaveBeenCalledTimes(1);
    expect(core.setSecret).toHaveBeenCalledWith('super-secret-value');

    expect(core.exportVariable).toHaveBeenCalledTimes(1);
    expect(core.exportVariable).toHaveBeenCalledWith('CLOUDFLARE_ACCOUNT_ID', 'super-secret-value');
  });
});

import skipSmokeTestsLocally from './utils/skipSmoke';
import util from 'util';
import child_process from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import portfinder from 'portfinder';
import * as mockNewTaggedRelease from './utils/mockNewTaggedRelease';
import which from 'which';

const exec = util.promisify(child_process.exec);

describe('tagged releases smoke tests', () => {
  skipSmokeTestsLocally();
  // const distBundle = path.join(__dirname, '../dist', 'index.js');

  const sanitizeEnvironment = async () => {
    const bundlePath = path.join(__dirname, '../dist');
    const tdir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghactions-'));
    await exec(`cp ${bundlePath}/* ${tdir}/`);
    return path.join(tdir, 'index.js');
  };

  it('should create a new release', async () => {
    const httpPort = await portfinder.getPortPromise();
    const mockHttp = mockNewTaggedRelease.server.listen(httpPort);
    const bundle = await sanitizeEnvironment();

    const node = which.sync('node');
    const {stdout, stderr} = await exec(`${node} ${bundle}`, {
      cwd: os.tmpdir(),
      env: {
        ...mockNewTaggedRelease.setupEnv,
        JEST_MOCK_HTTP_PORT: JSON.stringify(httpPort),
        AUTOMATIC_RELEASES_TAG: '',
      },
    });

    // Should set the AUTOMATIC_RELEASES_TAG env variable to "v0.0.1"
    expect(stdout).toEqual(expect.stringMatching(/::set-env name=AUTOMATIC_RELEASES_TAG::v0.0.1/));

    // There should not be any stderr output
    expect(stderr).toBe('');

    mockHttp.close();
  });
});

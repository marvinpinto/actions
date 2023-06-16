import skipSmokeTestsLocally from '../../automatic-releases/__tests__/utils/skipSmoke';
import util from 'util';
import child_process from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';
import portfinder from 'portfinder';
import * as mockSuccessBuildMsg from './utils/mockSuccessBuildMsg';
import which from 'which';

const exec = util.promisify(child_process.exec)

describe('main handler smoke tests', () => {
  skipSmokeTestsLocally();
  const distBundle = path.join(__dirname, '../dist', 'index.js');

  const sanitizeEnvironment = async () => {
    const bundlePath = path.join(__dirname, '../dist');
    const tdir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghactions-'));
    await exec(`cp ${bundlePath}/* ${tdir}/`);
    return path.join(tdir, 'index.js');
  };

  it('should send out a "success" build message', async (cb) => {
    const httpPort = await portfinder.getPortPromise();
    const mockHttp = mockSuccessBuildMsg.server.listen(httpPort);
    const bundle = await sanitizeEnvironment();

    const node = which.sync('node')
    const {stdout, stderr} = await exec(`${node} ${bundle}`, {
      cwd: os.tmpdir(),
      env: {
        ...mockSuccessBuildMsg.setupEnv,
        JEST_MOCK_HTTP_PORT: JSON.stringify(httpPort),
      },
    });

    // Should send out the opensentinel API request
    expect(stdout).toEqual(expect.stringMatching(/Outbound message: GitHub build \*\*Testing Production Deployment\*\* \(tag v0.0.1\) for repository `marvinpinto\/private-actions-tester` completed successfully :tada: - https:\/\/git.io\/fake1234/));

    // There should not be any stderr output
    expect(stderr).toEqual('');

    mockHttp.close(cb);
  });
});

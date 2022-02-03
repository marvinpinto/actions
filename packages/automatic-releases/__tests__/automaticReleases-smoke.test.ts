import skipSmokeTestsLocally from './utils/skipSmoke';
import util from 'util';
import child_process from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import portfinder from 'portfinder';
import * as mockNewReleaseTag from './utils/mockNewReleaseTag';
import * as mockUpdateExistingTag from './utils/mockUpdateExistingTag';

const exec = util.promisify(child_process.exec)

describe('automatic releases smoke tests', () => {
  skipSmokeTestsLocally();
  const distBundle = path.join(__dirname, '../dist', 'index.js');

  const sanitizeEnvironment = async () => {
    const bundlePath = path.join(__dirname, '../dist');
    const tdir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghactions-'));
    await exec(`cp ${bundlePath}/* ${tdir}/`);
    return path.join(tdir, 'index.js');
  };

  it('should create a new release tag', async (cb) => {
    const httpPort = await portfinder.getPortPromise();
    const mockHttp = mockNewReleaseTag.server.listen(httpPort);
    const bundle = await sanitizeEnvironment();

    const {stdout, stderr} = await exec(`${process.execPath} ${bundle}`, {
      cwd: os.tmpdir(),
      env: {
        ...mockNewReleaseTag.setupEnv,
        JEST_MOCK_HTTP_PORT: JSON.stringify(httpPort),
        AUTOMATIC_RELEASES_TAG: '',
      },
    });

    // Should set the AUTOMATIC_RELEASES_TAG env variable to "testingtaglatest"
    expect(stdout).toEqual(expect.stringMatching(/::set-env name=AUTOMATIC_RELEASES_TAG::testingtaglatest/));

    // There should not be any stderr output
    expect(stderr).toEqual('');

    mockHttp.close(cb);
  });

  it('should update an existing release tag', async (cb) => {
    const httpPort = await portfinder.getPortPromise();
    const mockHttp = mockUpdateExistingTag.server.listen(httpPort);
    const bundle = await sanitizeEnvironment();

    const {stdout, stderr} = await exec(`${process.execPath} ${bundle}`, {
      cwd: os.tmpdir(),
      env: {
        ...mockUpdateExistingTag.setupEnv,
        JEST_MOCK_HTTP_PORT: JSON.stringify(httpPort),
        AUTOMATIC_RELEASES_TAG: '',
      },
    });

    // Should set the AUTOMATIC_RELEASES_TAG env variable to "testingtaglatest"
    expect(stdout).toEqual(expect.stringMatching(/::set-env name=AUTOMATIC_RELEASES_TAG::testingtaglatest/));

    // There should not be any stderr output
    expect(stderr).toEqual('');

    mockHttp.close(cb);
  });
});

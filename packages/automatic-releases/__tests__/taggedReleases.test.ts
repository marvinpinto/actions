import * as process from 'process';
import * as path from 'path';
import nock from 'nock';
import fs from 'fs';
import {uploadReleaseArtifacts} from '../src/uploadReleaseArtifacts';
import {main} from '../src/main';
import * as core from '@actions/core';

jest.mock('../src/uploadReleaseArtifacts');

const mockedUploadReleaseArtifacts = uploadReleaseArtifacts as jest.MockedFunction<typeof uploadReleaseArtifacts>;

describe('main handler processing tagged releases', () => {
  const testGhToken = 'fake-secret-token';
  const testGhSHA = 'f6f40d9fbd1130f7f2357bb54225567dbd7a3793';
  const testInputDraft = false;
  const testInputPrerelease = false;
  const testInputBody = `## Commits\n- f6f40d9: Fix all the bugs (Monalisa Octocat)`;
  const testInputFiles = 'file1.txt\nfile2.txt\n*.jar\n\n';

  beforeEach(() => {
    jest.clearAllMocks();
    nock.disableNetConnect();
    process.env['INPUT_REPO_TOKEN'] = testGhToken;
    process.env['INPUT_DRAFT'] = testInputDraft.toString();
    process.env['INPUT_PRERELEASE'] = testInputPrerelease.toString();
    process.env['INPUT_FILES'] = testInputFiles;

    process.env['GITHUB_EVENT_NAME'] = 'push';
    process.env['GITHUB_SHA'] = testGhSHA;
    process.env['GITHUB_REF'] = 'refs/tags/v0.0.1';
    process.env['GITHUB_WORKFLOW'] = 'keybase';
    process.env['GITHUB_ACTION'] = 'self';
    process.env['GITHUB_ACTOR'] = 'marvinpinto';
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'git-push.json');
    process.env['GITHUB_REPOSITORY'] = 'marvinpinto/private-actions-tester';

    mockedUploadReleaseArtifacts.mockImplementation().mockResolvedValue(Promise.resolve());
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
    delete process.env['AUTOMATIC_RELEASES_TAG'];
  });

  it('throws an error if the github event tag does not conform to semantic versioning', async () => {
    process.env['GITHUB_REF'] = 'refs/tags/faketag';
    await expect(main()).rejects.toThrow(
      'The parameter "automatic_release_tag" was not set and the current tag "faketag" does not appear to conform to semantic versioning.',
    );
  });

  it('should create a new release', async () => {
    const releaseId = '123';
    const releaseUploadUrl = 'https://releaseupload.example.com';
    const compareCommitsPayload = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'payloads', 'compare-commits.json'), 'utf8'),
    );

    const searchForPreviousReleaseTag = nock('https://api.github.com')
      .matchHeader('authorization', `token ${testGhToken}`)
      .get(`/repos/marvinpinto/private-actions-tester/tags`)
      .reply(200, [
        {
          name: 'v0.0.0',
          commit: {
            sha: 'c5b97d5ae6c19d5c5df71a34c7fbeeda2479ccbc',
            url: 'https://api.github.com/repos/octocat/Hello-World/commits/c5b97d5ae6c19d5c5df71a34c7fbeeda2479ccbc',
          },
          zipball_url: 'https://github.com/octocat/Hello-World/zipball/v0.0.0',
          tarball_url: 'https://github.com/octocat/Hello-World/tarball/v0.0.0',
        },
        {
          name: 'v0.1',
          commit: {
            sha: 'c5b97d5ae6c19d5c5df71a34c7fbeeda2479aaaa',
            url: 'https://api.github.com/repos/octocat/Hello-World/commits/c5b97d5ae6c19d5c5df71a34c7fbeeda2479aaaa',
          },
          zipball_url: 'https://github.com/octocat/Hello-World/zipball/v0.1',
          tarball_url: 'https://github.com/octocat/Hello-World/tarball/v0.1',
        },
        {
          name: 'v0.0.1',
          commit: {
            sha: 'c5b97d5ae6c19d5c5df71a34c7fbeeda2479nnnn',
            url: 'https://api.github.com/repos/octocat/Hello-World/commits/c5b97d5ae6c19d5c5df71a34c7fbeeda2479nnnn',
          },
          zipball_url: 'https://github.com/octocat/Hello-World/zipball/v0.0.1',
          tarball_url: 'https://github.com/octocat/Hello-World/tarball/v0.0.1',
        },
      ]);

    const getCommitsSinceRelease = nock('https://api.github.com')
      .matchHeader('authorization', `token ${testGhToken}`)
      .get(`/repos/marvinpinto/private-actions-tester/compare/HEAD...${testGhSHA}`)
      .reply(200, compareCommitsPayload);

    const _getRef = nock('https://api.github.com')
      .matchHeader('authorization', `token ${testGhToken}`)
      .get(`/repos/marvinpinto/private-actions-tester/git/refs/tags/v0.0.0`)
      .reply(404);

    const listAssociatedPRs = nock('https://api.github.com')
      .matchHeader('authorization', `token ${testGhToken}`)
      .get(`/repos/marvinpinto/private-actions-tester/commits/${testGhSHA}/pulls`)
      .reply(200, []);

    const createRelease = nock('https://api.github.com')
      .matchHeader('authorization', `token ${testGhToken}`)
      .post('/repos/marvinpinto/private-actions-tester/releases', {
        tag_name: 'v0.0.1',
        name: 'v0.0.1',
        draft: testInputDraft,
        prerelease: testInputPrerelease,
        body: testInputBody,
      })
      .reply(200, {
        id: releaseId,
        upload_url: releaseUploadUrl,
      });

    await main();

    expect(getCommitsSinceRelease.isDone()).toBe(true);
    expect(listAssociatedPRs.isDone()).toBe(true);
    expect(createRelease.isDone()).toBe(true);
    expect(searchForPreviousReleaseTag.isDone()).toBe(true);

    expect(mockedUploadReleaseArtifacts).toHaveBeenCalledTimes(1);
    expect(mockedUploadReleaseArtifacts.mock.calls[0][1]).toEqual({
      owner: 'marvinpinto',
      release_id: releaseId,
      repo: 'private-actions-tester',
    });
    expect(mockedUploadReleaseArtifacts.mock.calls[0][2]).toEqual(['file1.txt', 'file2.txt', '*.jar']);

    // Should populate the output env variable
    expect(core.exportVariable).toHaveBeenCalledTimes(1);
    expect(core.exportVariable).toHaveBeenCalledWith('AUTOMATIC_RELEASES_TAG', 'v0.0.1');
  });
});

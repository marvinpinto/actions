/* eslint-disable @typescript-eslint/no-var-requires */

import * as process from 'process';
import * as path from 'path';
import nock from 'nock';

describe('main handler', () => {
  const testGhToken = 'fake-secret-token';
  const testGhSHA = 'f6f40d9fbd1130f7f2357bb54225567dbd7a3793';
  const testInputReleaseTag = 'testingtaglatest';
  const testInputDraft = false;
  const testInputPrerelease = true;
  const testInputTitle = 'Development Build';
  const testInputBody = `Automatically generated from the current master branch (${testGhSHA})`;

  beforeEach(() => {
    jest.resetModules();
    nock.disableNetConnect();
    process.env['INPUT_REPO_TOKEN'] = testGhToken;
    process.env['INPUT_RELEASE_TAG'] = testInputReleaseTag;
    process.env['INPUT_DRAFT'] = testInputDraft.toString();
    process.env['INPUT_PRERELEASE'] = testInputPrerelease.toString();
    process.env['INPUT_TITLE'] = testInputTitle;

    process.env['GITHUB_EVENT_NAME'] = 'push';
    process.env['GITHUB_SHA'] = testGhSHA;
    process.env['GITHUB_REF'] = 'refs/heads/automatic-pre-releaser';
    process.env['GITHUB_WORKFLOW'] = 'keybase';
    process.env['GITHUB_ACTION'] = 'self';
    process.env['GITHUB_ACTOR'] = 'marvinpinto';
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'git-push.json');
  });

  afterEach(() => {
    jest.clearAllMocks();
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it('throws an error when "repo_token" is not supplied', async () => {
    delete process.env.INPUT_REPO_TOKEN;
    const inst = require('../src/main');
    await expect(inst.main()).rejects.toThrow('Input required and not supplied: repo_token');
  });

  it('throws an error when "release_tag" is not supplied', async () => {
    delete process.env.INPUT_RELEASE_TAG;
    const inst = require('../src/main');
    await expect(inst.main()).rejects.toThrow('Input required and not supplied: release_tag');
  });

  it('should create a new release tag', async () => {
    const createRef = nock('https://api.github.com')
      .matchHeader('authorization', `token ${testGhToken}`)
      .post('/repos/marvinpinto/private-actions-tester/git/refs', {
        ref: `refs/tags/${testInputReleaseTag}`,
        sha: testGhSHA,
      })
      .reply(200);

    const getReleaseByTag = nock('https://api.github.com')
      .matchHeader('authorization', `token ${testGhToken}`)
      .get(`/repos/marvinpinto/private-actions-tester/releases/tags/${testInputReleaseTag}`)
      .reply(400);

    const createRelease = nock('https://api.github.com')
      .matchHeader('authorization', `token ${testGhToken}`)
      .post('/repos/marvinpinto/private-actions-tester/releases', {
        tag_name: testInputReleaseTag, // eslint-disable-line @typescript-eslint/camelcase
        name: testInputTitle,
        draft: testInputDraft,
        prerelease: testInputPrerelease,
        body: testInputBody,
      })
      .reply(200);

    const inst = require('../src/main');
    await inst.main();

    expect(createRef.isDone()).toBe(true);
    expect(getReleaseByTag.isDone()).toBe(true);
    expect(createRelease.isDone()).toBe(true);
  });

  it('should update an existing release tag', async () => {
    const foundReleaseId = 1235523222;

    const createRef = nock('https://api.github.com')
      .matchHeader('authorization', `token ${testGhToken}`)
      .post('/repos/marvinpinto/private-actions-tester/git/refs', {
        ref: `refs/tags/${testInputReleaseTag}`,
        sha: testGhSHA,
      })
      .reply(400);

    const updateRef = nock('https://api.github.com')
      .matchHeader('authorization', `token ${testGhToken}`)
      .patch(`/repos/marvinpinto/private-actions-tester/git/refs/tags/${testInputReleaseTag}`, {
        sha: testGhSHA,
        force: true,
      })
      .reply(200);

    const getReleaseByTag = nock('https://api.github.com')
      .matchHeader('authorization', `token ${testGhToken}`)
      .get(`/repos/marvinpinto/private-actions-tester/releases/tags/${testInputReleaseTag}`)
      .reply(200, {
        id: foundReleaseId,
      });

    const deleteRelease = nock('https://api.github.com')
      .matchHeader('authorization', `token ${testGhToken}`)
      .delete(`/repos/marvinpinto/private-actions-tester/releases/${foundReleaseId}`)
      .reply(200);

    const createRelease = nock('https://api.github.com')
      .matchHeader('authorization', `token ${testGhToken}`)
      .post('/repos/marvinpinto/private-actions-tester/releases', {
        tag_name: testInputReleaseTag, // eslint-disable-line @typescript-eslint/camelcase
        name: testInputTitle,
        draft: testInputDraft,
        prerelease: testInputPrerelease,
        body: testInputBody,
      })
      .reply(200);

    const inst = require('../src/main');
    await inst.main();

    expect(createRef.isDone()).toBe(true);
    expect(updateRef.isDone()).toBe(true);
    expect(getReleaseByTag.isDone()).toBe(true);
    expect(deleteRelease.isDone()).toBe(true);
    expect(createRelease.isDone()).toBe(true);
  });
});

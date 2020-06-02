/* eslint-disable @typescript-eslint/no-var-requires */

import * as process from 'process';
import * as path from 'path';
import nock from 'nock';

describe('main handler', () => {
  let mockUtils;

  beforeEach(() => {
    jest.resetModules();
    nock.disableNetConnect();

    process.env['INPUT_OPENSENTINEL_TOKEN'] = 'abcd1234fake';
    process.env['INPUT_JOB_STATUS'] = 'Success';
    process.env['INPUT_JOB_NAME'] = 'Testing Production Deployment';
    process.env['INPUT_ON_SUCCESS'] = 'always';
    process.env['INPUT_ON_FAILURE'] = 'always';

    process.env['GITHUB_EVENT_NAME'] = 'push';
    process.env['GITHUB_SHA'] = 'f6f40d9fbd1130f7f2357bb54225567dbd7a3793';
    process.env['GITHUB_REF'] = 'refs/tags/v0.0.1';
    process.env['GITHUB_WORKFLOW'] = 'keybase';
    process.env['GITHUB_ACTION'] = 'self';
    process.env['GITHUB_ACTOR'] = 'marvinpinto';
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'force-push.json');
    process.env['GITHUB_REPOSITORY'] = 'marvinpinto/private-actions-tester';

    mockUtils = {
      getShortenedUrl: jest.fn().mockResolvedValue('https://example.com'),
    };
    jest.mock('../src/utils', () => {
      return mockUtils;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it('is able to send out a "success" build message', async () => {
    const opensentinelAPIcall = nock('https://automations.opensentinel.com')
      .post(
        '/webhook?token=abcd1234fake',
        'GitHub build **Testing Production Deployment** (tag v0.0.1) for repository `marvinpinto/private-actions-tester` completed successfully :tada: - https://example.com',
      )
      .reply(202, {
        message: 'Thanks!',
      });

    const inst = require('../src/main');
    await inst.main();
    expect(opensentinelAPIcall.isDone()).toBe(true);
  });

  it('is able to send out a "failure" build message', async () => {
    process.env['INPUT_JOB_STATUS'] = 'Failure';
    const opensentinelAPIcall = nock('https://automations.opensentinel.com')
      .post(
        '/webhook?token=abcd1234fake',
        'GitHub build **Testing Production Deployment** (tag v0.0.1) for repository `marvinpinto/private-actions-tester` failed :rotating_light: - https://example.com',
      )
      .reply(202, {
        message: 'Thanks!',
      });

    const inst = require('../src/main');
    await inst.main();
    expect(opensentinelAPIcall.isDone()).toBe(true);
  });

  it('is able to send out a "cancel" build message', async () => {
    process.env['INPUT_JOB_STATUS'] = 'Cancelled';
    const opensentinelAPIcall = nock('https://automations.opensentinel.com')
      .post(
        '/webhook?token=abcd1234fake',
        'GitHub build **Testing Production Deployment** (tag v0.0.1) for repository `marvinpinto/private-actions-tester` was cancelled by `marvinpinto` :warning: - https://example.com',
      )
      .reply(202, {
        message: 'Thanks!',
      });

    const inst = require('../src/main');
    await inst.main();
    expect(opensentinelAPIcall.isDone()).toBe(true);
  });

  it('reverts back to using the workflow name if no job name is specified', async () => {
    delete process.env['INPUT_JOB_NAME'];
    const opensentinelAPIcall = nock('https://automations.opensentinel.com')
      .post(
        '/webhook?token=abcd1234fake',
        'GitHub build **keybase** (tag v0.0.1) for repository `marvinpinto/private-actions-tester` completed successfully :tada: - https://example.com',
      )
      .reply(202, {
        message: 'Thanks!',
      });

    const inst = require('../src/main');
    await inst.main();
    expect(opensentinelAPIcall.isDone()).toBe(true);
  });

  it('falls back gracefully if this is not a tagged ref', async () => {
    process.env['GITHUB_REF'] = 'refs/heads/master';
    const opensentinelAPIcall = nock('https://automations.opensentinel.com')
      .post(
        '/webhook?token=abcd1234fake',
        'GitHub build **Testing Production Deployment** for repository `marvinpinto/private-actions-tester` completed successfully :tada: - https://example.com',
      )
      .reply(202, {
        message: 'Thanks!',
      });

    const inst = require('../src/main');
    await inst.main();
    expect(opensentinelAPIcall.isDone()).toBe(true);
  });

  it('falls back gracefully if there is no repository set (for whatever reason)', async () => {
    delete process.env['GITHUB_REPOSITORY'];
    const opensentinelAPIcall = nock('https://automations.opensentinel.com')
      .post(
        '/webhook?token=abcd1234fake',
        'GitHub build **Testing Production Deployment** (tag v0.0.1) completed successfully :tada: - https://example.com',
      )
      .reply(202, {
        message: 'Thanks!',
      });

    const inst = require('../src/main');
    await inst.main();
    expect(opensentinelAPIcall.isDone()).toBe(true);
  });

  it('does not send out success messages if configured not to', async () => {
    process.env['INPUT_ON_SUCCESS'] = 'never';
    const opensentinelAPIcall = nock('https://automations.opensentinel.com')
      .post(
        '/webhook?token=abcd1234fake',
        'GitHub build **Testing Production Deployment** (tag v0.0.1) for repository `marvinpinto/private-actions-tester` completed successfully :tada: - https://example.com',
      )
      .reply(202, {
        message: 'Thanks!',
      });

    const inst = require('../src/main');
    await inst.main();
    expect(opensentinelAPIcall.isDone()).toBe(false);
  });

  it('does not send out failure messages if configured not to', async () => {
    process.env['INPUT_ON_FAILURE'] = 'never';
    process.env['INPUT_JOB_STATUS'] = 'Failure';
    const opensentinelAPIcall = nock('https://automations.opensentinel.com')
      .post(
        '/webhook?token=abcd1234fake',
        'GitHub build **Testing Production Deployment** (tag v0.0.1) for repository `marvinpinto/private-actions-tester` failed :rotating_light: - https://example.com',
      )
      .reply(202, {
        message: 'Thanks!',
      });

    const inst = require('../src/main');
    await inst.main();
    expect(opensentinelAPIcall.isDone()).toBe(false);
  });

  it('fails gracefully if unable to send out the message via the opensentinel API', async () => {
    const opensentinelAPIcall = nock('https://automations.opensentinel.com')
      .post(
        '/webhook?token=abcd1234fake',
        'GitHub build **Testing Production Deployment** (tag v0.0.1) for repository `marvinpinto/private-actions-tester` completed successfully :tada: - https://example.com',
      )
      .reply(408, {
        message: 'Something terribly bad happened here',
      });

    const inst = require('../src/main');
    await inst.main();
    expect(opensentinelAPIcall.isDone()).toBe(true);
  });
});

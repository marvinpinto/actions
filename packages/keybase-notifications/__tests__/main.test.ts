/* eslint-disable @typescript-eslint/no-var-requires */

import * as process from 'process';
import * as path from 'path';

describe('main handler', () => {
  let mockKeybase;
  let mockKeybaseMethods;

  beforeEach(() => {
    jest.resetModules();

    process.env['INPUT_KEYBASE_USERNAME'] = 'fakebob';
    process.env['INPUT_KEYBASE_PAPER_KEY'] = 'this is a fake paper key';
    process.env['INPUT_KEYBASE_CHANNEL'] = 'funtimes';
    process.env['GITHUB_EVENT_NAME'] = 'push';

    mockKeybaseMethods = {
      init: jest.fn(() => Promise.resolve()),
      deinit: jest.fn(() => Promise.resolve()),
      sendChatMessage: jest.fn(() => Promise.resolve()),
      getKeybaseUsername: jest.fn(() => ''),
    };
    mockKeybase = jest.fn().mockImplementation(() => {
      return mockKeybaseMethods;
    });
    jest.mock('../src/keybase', () => {
      return mockKeybase;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws an error when "keybase_username" is not supplied', async () => {
    delete process.env.INPUT_KEYBASE_USERNAME;
    const inst = require('../src/main');
    await expect(inst.main()).rejects.toThrow('Input required and not supplied: keybase_username');
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(0);
  });

  it('throws an error when "keybase_password" is not supplied', async () => {
    delete process.env.INPUT_KEYBASE_PAPER_KEY;
    const inst = require('../src/main');
    await expect(inst.main()).rejects.toThrow('Input required and not supplied: keybase_paper_key');
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(0);
  });

  it('does not throw an error when "keybase_channel" is not supplied', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'force-push.json');
    delete process.env.INPUT_KEYBASE_CHANNEL;
    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybase).toHaveBeenCalledTimes(1);
    expect(mockKeybase).toHaveBeenCalledWith('fakebob', 'this is a fake paper key');
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
  });

  it('does not throw an error when it encounters an unsupported GitHub event', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'invalid.json');
    delete process.env.GITHUB_EVENT_NAME;
    const inst = require('../src/main');
    await inst.main();
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(0);
  });

  it('is able to process force-push events', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'force-push.json');
    process.env['GITHUB_EVENT_NAME'] = 'push';

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybase).toHaveBeenCalledTimes(1);
    expect(mockKeybase).toHaveBeenCalledWith('fakebob', 'this is a fake paper key');
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message:
        'GitHub user `marvinpinto` *force-pushed* 1 commit(s) to `refs/heads/master`. See https://github.com/marvinpinto/keybase-notifications-action/commit/8c1ccd210a0fb98e7f35213fc234f6def1eec9bc for details.',
    });
  });

  it('is able to process repo-starring events', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'repo-starring.json');
    process.env['GITHUB_EVENT_NAME'] = 'watch';

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message: 'Repository `marvinpinto/keybase-notifications-action` starred by `marvinpinto` :+1: :star:',
    });
  });

  it('is able to process push events', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'push.json');
    process.env['GITHUB_EVENT_NAME'] = 'push';

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message:
        'GitHub user `marvinpinto` pushed 1 commit(s) to `refs/heads/master`. See https://github.com/marvinpinto/keybase-notifications-action/commit/811c5dd3500dabb4487444674669a1c885f38b61 for details.',
    });
  });

  it('is able to correctly display keybase usernames for push events', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'push.json');
    process.env['GITHUB_EVENT_NAME'] = 'push';
    mockKeybaseMethods.getKeybaseUsername = jest.fn(() => 'keybasebob');

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message:
        'User @keybasebob pushed 1 commit(s) to `refs/heads/master`. See https://github.com/marvinpinto/keybase-notifications-action/commit/811c5dd3500dabb4487444674669a1c885f38b61 for details.',
    });
  });

  it('is able to correctly display keybase usernames for repo-starring events', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'repo-starring.json');
    process.env['GITHUB_EVENT_NAME'] = 'watch';
    mockKeybaseMethods.getKeybaseUsername = jest.fn(() => 'keybasebob');

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message: 'Repository `marvinpinto/keybase-notifications-action` starred by @keybasebob :+1: :star:',
    });
  });

  it('is able to process a pull_request updated event', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'pull-request-synchronize.json');
    process.env['GITHUB_EVENT_NAME'] = 'pull_request';

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message: 'PR https://github.com/marvinpinto/actions/pull/2 has been *updated* by GitHub user `marvinpinto`.',
    });
  });

  it('is able to process a pull_request closed event', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'pull-request-closed.json');
    process.env['GITHUB_EVENT_NAME'] = 'pull_request';

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message: 'PR https://github.com/marvinpinto/actions/pull/3 has been *closed* by GitHub user `marvinpinto`.',
    });
  });

  it('is able to process a pull_request reopened event', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'pull-request-reopened.json');
    process.env['GITHUB_EVENT_NAME'] = 'pull_request';

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message: 'PR https://github.com/marvinpinto/actions/pull/2 has been *reopened* by GitHub user `marvinpinto`.',
    });
  });

  it('is able to process a pull_request merged event', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'pull-request-merged.json');
    process.env['GITHUB_EVENT_NAME'] = 'pull_request';

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message: 'PR https://github.com/marvinpinto/actions/pull/3 has been *merged* by GitHub user `marvinpinto`.',
    });
  });

  it('is able to process a pull_request opened event', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'pull-request-opened.json');
    process.env['GITHUB_EVENT_NAME'] = 'pull_request';
    mockKeybaseMethods.getKeybaseUsername = jest.fn(() => 'keybasebob');

    const inst = require('../src/main');
    await inst.main();

    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockKeybaseMethods.sendChatMessage).toHaveBeenCalledWith({
      teamInfo: {channel: 'funtimes', teamName: '', topicName: ''},
      message: 'New PR https://github.com/marvinpinto/actions/pull/4 *opened* by @keybasebob.',
    });
  });
});

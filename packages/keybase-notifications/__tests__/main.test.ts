import * as process from 'process';
import * as path from 'path';

describe('main handler', () => {
  let mockSendChatMessage;

  beforeEach(() => {
    jest.resetModules();
    process.env['INPUT_KEYBASE_USERNAME'] = 'fakebob';
    process.env['INPUT_KEYBASE_PAPER_KEY'] = 'this is a fake paper key';
    process.env['INPUT_KEYBASE_CHANNEL'] = 'funtimes';
    process.env['GITHUB_EVENT_NAME'] = 'push';

    mockSendChatMessage = jest.fn(() => Promise.resolve());
    jest.mock('../src/keybase', () => {
      return {
        sendChatMessage: mockSendChatMessage,
      };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws an error when "keybase_username" is not supplied', async () => {
    delete process.env.INPUT_KEYBASE_USERNAME;
    const run = require('../src/main').run;
    await expect(run()).rejects.toThrow('Input required and not supplied: keybase_username');
  });

  it('throws an error when "keybase_password" is not supplied', async () => {
    delete process.env.INPUT_KEYBASE_PAPER_KEY;
    const run = require('../src/main').run;
    await expect(run()).rejects.toThrow('Input required and not supplied: keybase_paper_key');
  });

  it('does not throw an error when "keybase_channel" is not supplied', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'force-push.json');
    delete process.env.INPUT_KEYBASE_CHANNEL;
    await require('../src/main');

    expect(mockSendChatMessage).toHaveBeenCalledTimes(1);
  });

  it('throws an error when it encounters an unsupported GitHub event', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'invalid.json');
    delete process.env.GITHUB_EVENT_NAME;
    const run = require('../src/main').run;
    await expect(run()).rejects.toThrow('Unsupported GitHub event');
  });

  it('is able to process force-push events', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'force-push.json');
    process.env['GITHUB_EVENT_NAME'] = 'push';

    await require('../src/main');

    expect(mockSendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockSendChatMessage).toHaveBeenCalledWith(
      'fakebob',
      'this is a fake paper key',
      {channel: 'funtimes', teamName: '', topicName: ''},
      'GitHub user marvinpinto force-pushed 1 commit(s) to refs/heads/master (repo: marvinpinto/keybase-notifications-action). See https://github.com/marvinpinto/keybase-notifications-action/commit/8c1ccd210a0fb98e7f35213fc234f6def1eec9bc for details.',
    );
  });

  it('is able to process repo-starring events', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'repo-starring.json');
    process.env['GITHUB_EVENT_NAME'] = 'watch';

    await require('../src/main');

    expect(mockSendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockSendChatMessage).toHaveBeenCalledWith(
      'fakebob',
      'this is a fake paper key',
      {channel: 'funtimes', teamName: '', topicName: ''},
      'Repository `marvinpinto/keybase-notifications-action` starred by `marvinpinto` (1 :star:)',
    );
  });

  it('is able to process push events', async () => {
    process.env['GITHUB_EVENT_PATH'] = path.join(__dirname, 'payloads', 'push.json');
    process.env['GITHUB_EVENT_NAME'] = 'push';

    await require('../src/main');

    expect(mockSendChatMessage).toHaveBeenCalledTimes(1);
    expect(mockSendChatMessage).toHaveBeenCalledWith(
      'fakebob',
      'this is a fake paper key',
      {channel: 'funtimes', teamName: '', topicName: ''},
      'GitHub user marvinpinto pushed 1 commit(s) to refs/heads/master (repo: marvinpinto/keybase-notifications-action). See https://github.com/marvinpinto/keybase-notifications-action/commit/811c5dd3500dabb4487444674669a1c885f38b61 for details.',
    );
  });
});

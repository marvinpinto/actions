import Bot from 'keybase-bot';
import * as path from 'path';

export default class Keybase {
  bot: Bot;
  keybaseBinary: string;
  username: string;
  paperKey: string;

  constructor(username, paperKey) {
    this.bot = new Bot();
    this.keybaseBinary = path.join(__dirname, 'keybase');
    console.debug(`Keybase binary location: ${this.keybaseBinary}`);
    this.username = username;
    this.paperKey = paperKey;
  }

  public async init() {
    await this.bot.init(this.username, this.paperKey, {
      verbose: false,
      botLite: true,
      disableTyping: true,
      keybaseBinaryLocation: this.keybaseBinary,
    });
  }

  public async deinit() {
    await this.bot.deinit();
  }

  public async sendChatMessage(args) {
    const channel = {
      public: false,
      topicType: 'chat',
      name: '',
      membersType: '',
      topicName: '',
    };
    if (args.teamInfo.channel) {
      channel['name'] = args.teamInfo.channel;
    } else {
      channel['name'] = args.teamInfo.teamName;
      channel['membersType'] = 'team';
      channel['topicName'] = args.teamInfo.topicName;
    }

    await this.bot.chat.send(channel, {body: args.message});
  }
}

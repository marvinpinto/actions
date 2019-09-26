import Bot from 'keybase-bot';
import * as path from 'path';

export async function sendChatMessage(username, paperKey, teamInfo, message) {
  const bot = new Bot();
  const kbLocation = path.join(__dirname, 'keybase');
  console.log(`Setting keybase binary location to: ${kbLocation}`);

  await bot.init(username, paperKey, {
    verbose: false,
    botLite: true,
    disableTyping: true,
    keybaseBinaryLocation: kbLocation,
  });

  const channel = {
    public: false,
    topicType: 'chat',
    name: '',
    membersType: '',
    topicName: '',
  };
  if (teamInfo.channel) {
    channel['name'] = teamInfo.channel;
  } else {
    channel['name'] = teamInfo.teamName;
    channel['membersType'] = 'team';
    channel['topicName'] = teamInfo.topicName;
  }

  await bot.chat.send(channel, {body: message});
  await bot.deinit();
}

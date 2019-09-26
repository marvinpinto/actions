import Bot from 'keybase-bot';

export async function sendChatMessage(username, paperKey, channelName, message) {
  console.log('ACTUALLY CALLING');
  const bot = new Bot();
  await bot.init(username, paperKey, {verbose: true});
  console.log('initialized!');
  const channel = {name: 'marvinpinto,' + username, public: false, topicType: 'chat'};
  const msg = {
    body: message,
  };
  await bot.chat.send(channel, msg);
  console.log('message sent?');
  await bot.deinit();
}

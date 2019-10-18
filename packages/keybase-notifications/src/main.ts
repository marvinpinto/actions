import * as core from '@actions/core';
import * as github from '@actions/github';
import {generateChatMessage} from './githubEvent';
import Keybase from './keybase';
import {dumpGitHubEventPayload} from './utils';

type Args = {
  keybaseUsername: string;
  keybasePaperKey: string;
  keybaseChannel: string;
  keybaseTeamName: string;
  keybaseTopicName: string;
};

const getAndValidateArgs = (): Args => {
  const args = {
    keybaseUsername: core.getInput('keybase_username', {required: true}),
    keybasePaperKey: core.getInput('keybase_paper_key', {required: true}),
    keybaseChannel: core.getInput('keybase_channel'),
    keybaseTeamName: core.getInput('keybase_team_name'),
    keybaseTopicName: core.getInput('keybase_topic_name'),
  };

  return args;
};

export const main = async () => {
  try {
    const args = getAndValidateArgs();

    core.startGroup('Initializing the Keybase Notifications action');
    dumpGitHubEventPayload();
    core.debug(`Github context: ${JSON.stringify(github.context)}`);
    const kb = new Keybase(args.keybaseUsername, args.keybasePaperKey);
    await kb.init();
    core.endGroup();

    core.startGroup('Determining keybase ID for the user who triggered this event');
    const associatedKeybaseUsername = await kb.getKeybaseUsername(github.context.actor);
    core.endGroup();

    const chatMessage: string = await generateChatMessage({
      context: github.context,
      keybaseUsername: associatedKeybaseUsername,
    });
    if (chatMessage) {
      await kb.sendChatMessage({
        teamInfo: {
          channel: args.keybaseChannel,
          teamName: args.keybaseTeamName,
          topicName: args.keybaseTopicName,
        },
        message: chatMessage,
      });
    }

    await kb.deinit();
  } catch (error) {
    core.setFailed(error.message);
    throw error;
  }
};

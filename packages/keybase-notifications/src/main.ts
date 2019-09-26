import * as core from '@actions/core';
import * as github from '@actions/github';
import {generateChatMessage} from './githubEvent';
import {sendChatMessage} from './keybase';

export async function run() {
  try {
    const context = github.context;
    const keybaseUsername: string = core.getInput('keybase_username', {required: true});
    const keybasePaperKey: string = core.getInput('keybase_paper_key', {required: true});
    const chatMessage: string = generateChatMessage(context);
    await sendChatMessage(keybaseUsername, keybasePaperKey, 'channel', chatMessage);
  } catch (error) {
    core.setFailed(error.message);
    throw error;
  }
}

run();

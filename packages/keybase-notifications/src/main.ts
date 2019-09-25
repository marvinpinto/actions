import * as core from '@actions/core';
import * as github from '@actions/github';
import {wait} from './wait';

async function run() {
  try {
    const context = github.context;
    console.log(`Context is: " ${JSON.stringify(context)}`);

    const ms = core.getInput('milliseconds');
    console.log(`Waiting ${ms} milliseconds ...`);

    core.debug(new Date().toTimeString());
    wait(parseInt(ms));
    core.debug(new Date().toTimeString());

    core.setOutput('time', new Date().toTimeString());
    return;
  } catch (error) {
    core.setFailed(error.message);
    return;
  }
}

run();

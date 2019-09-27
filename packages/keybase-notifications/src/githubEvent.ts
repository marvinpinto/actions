import {get} from 'lodash';

function parsePushEvent({payload, keybaseUsername}): string {
  const ghUser = get(payload, 'sender.login', 'UNKNOWN');
  const numCommits = get(payload, 'commits', []).length;
  const branchRef = get(payload, 'ref', 'N/A');
  const url = get(payload, 'head_commit.url', 'N/A');
  const forced = get(payload, 'forced', false);
  const forcedStr = forced ? '*force-pushed*' : 'pushed';
  const userStr = keybaseUsername ? `User @${keybaseUsername}` : `GitHub user \`${ghUser}\``;
  return `${userStr} ${forcedStr} ${numCommits} commit(s) to \`${branchRef}\`. See ${url} for details.`;
}

function parseRepoStarringEvent({payload, keybaseUsername}): string {
  const ghUser = get(payload, 'sender.login', 'UNKNOWN');
  const repo = get(payload, 'repository.full_name', 'UNKNOWN');
  const userStr = keybaseUsername ? `@${keybaseUsername}` : `\`${ghUser}\``;
  return `Repository \`${repo}\` starred by ${userStr} :+1: :star:`;
}

function parsePullRequestEvent({payload, keybaseUsername}): string {
  const ghUser = get(payload, 'sender.login', 'UNKNOWN');
  const url = get(payload, 'pull_request.html_url', 'N/A');
  const userStr = keybaseUsername ? `@${keybaseUsername}` : `GitHub user \`${ghUser}\``;
  const action = get(payload, 'action', null);
  const merged = get(payload, 'pull_request.merged', false);
  const strNewPrPrefix = action === 'opened' ? 'New PR' : 'PR';
  const strPastTense = action === 'opened' ? '' : ' has been';
  const actionMap = {
    synchronize: '*updated*',
    opened: '*opened*',
    closed: merged ? '*merged*' : '*closed*',
    reopened: '*reopened*',
  };
  const actionStr = get(actionMap, action, 'n/a');
  return `${strNewPrPrefix} ${url}${strPastTense} ${actionStr} by ${userStr}.`;
}

export function generateChatMessage({context, keybaseUsername}): string {
  console.debug(`GitHub event: ${JSON.stringify(context)}`);
  if (get(context, 'eventName', null) === 'push') {
    return parsePushEvent({payload: context.payload, keybaseUsername});
  }

  if (get(context, 'eventName', null) === 'watch') {
    return parseRepoStarringEvent({payload: context.payload, keybaseUsername});
  }

  if (get(context, 'eventName', null) === 'pull_request') {
    return parsePullRequestEvent({payload: context.payload, keybaseUsername});
  }

  console.error('Ignoring this event as it is unsupported by this application.');
  return '';
}

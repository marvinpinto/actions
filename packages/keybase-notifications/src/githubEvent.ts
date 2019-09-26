import {get} from 'lodash';

function parsePushEvent(payload): string {
  const ghUser = get(payload, 'sender.login', 'UNKNOWN');
  const numCommits = get(payload, 'commits', []).length;
  const branchRef = get(payload, 'ref', 'N/A');
  const repo = get(payload, 'repository.full_name', 'UNKNOWN');
  const url = get(payload, 'head_commit.url', 'N/A');
  const forced = get(payload, 'forced', false);
  const forcedStr = forced ? 'force-pushed' : 'pushed';
  return `GitHub user ${ghUser} ${forcedStr} ${numCommits} commit(s) to ${branchRef} (repo: ${repo}). See ${url} for details.`;
}

export function generateChatMessage(context): string {
  if (get(context, 'eventName', null) === 'push') {
    return parsePushEvent(context.payload);
  }

  console.log(`This is an unsupported GitHub event: ${JSON.stringify(context)}`);
  throw new Error('Unsupported GitHub event');
}

import {get} from 'lodash';

function getShortSHA(sha): string {
  const coreAbbrev = 7;
  return sha.substring(0, coreAbbrev);
}

export function parseIntoQuotedString(body): string {
  let quotedStr = body
    .trim()
    .split('\n')
    .reduce((acc, line) => {
      return acc + `\n> ${line}`;
    });

  // Prepend '>' to account for the first line
  quotedStr = `> ${quotedStr}`;

  return quotedStr;
}

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

function parseCommitCommentEvent({payload, keybaseUsername}): string {
  const ghUser = get(payload, 'sender.login', 'UNKNOWN');
  const repo = get(payload, 'repository.full_name', 'UNKNOWN');
  const userStr = keybaseUsername ? `@${keybaseUsername}` : `\`${ghUser}\``;
  const sha = getShortSHA(get(payload, 'comment.commit_id', 'n/a'));
  const url = get(payload, 'comment.html_url', 'N/A');
  return `New comment on \`${repo}@${sha}\` by ${userStr}. See ${url} for details.`;
}

function parseIssuesEvent({payload, keybaseUsername}): string {
  const ghUser = get(payload, 'sender.login', 'UNKNOWN');
  const url = get(payload, 'issue.html_url', 'N/A');
  const userStr = keybaseUsername ? `@${keybaseUsername}` : `GitHub user \`${ghUser}\``;
  const action = get(payload, 'action', null);
  const issueNumber = get(payload, 'issue.number', 'n/a');
  const issueTitle = get(payload, 'issue.title', 'n/a');
  const issueBody = get(payload, 'issue.body', '');
  const quotedBody = parseIntoQuotedString(issueBody);
  const actionMap = {
    opened: '*opened*',
    edited: '*updated*',
    closed: '*closed*',
    reopened: '*reopened*',
  };
  const actionStr = get(actionMap, action, 'n/a');
  return `Issue #${issueNumber} ${actionStr} by ${userStr} - ${url}\n> Title: *${issueTitle}*\n${quotedBody}`;
}

function parseIssueCommentEvent({payload, keybaseUsername}): string {
  const ghUser = get(payload, 'sender.login', 'UNKNOWN');
  const url = get(payload, 'issue.html_url', 'N/A');
  const userStr = keybaseUsername ? `@${keybaseUsername}` : `GitHub user \`${ghUser}\``;
  const action = get(payload, 'action', null);
  const issueNumber = get(payload, 'issue.number', 'n/a');
  const commentBody = get(payload, 'comment.body', 'N/A');
  const actionMap = {
    created: '*New*',
    edited: '*Updated*',
    deleted: '*Deleted*',
  };
  const actionStr = get(actionMap, action, 'N/A');
  const preposition = action === 'deleted' ? 'by' : 'from';
  const quotedComment = parseIntoQuotedString(commentBody);
  return `${actionStr} comment on Issue #${issueNumber} ${preposition} ${userStr}. ${url}\n${quotedComment}`;
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

  if (get(context, 'eventName', null) === 'commit_comment') {
    return parseCommitCommentEvent({payload: context.payload, keybaseUsername});
  }

  if (get(context, 'eventName', null) === 'issues') {
    return parseIssuesEvent({payload: context.payload, keybaseUsername});
  }

  if (get(context, 'eventName', null) === 'issue_comment') {
    return parseIssueCommentEvent({payload: context.payload, keybaseUsername});
  }

  console.error('Ignoring this event as it is unsupported by this application.');
  return '';
}

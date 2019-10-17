import * as core from '@actions/core';
import {get} from 'lodash';
import {getShortenedUrl} from './utils';

export const getShortSHA = (sha): string => {
  const coreAbbrev = 7;
  return sha.substring(0, coreAbbrev);
};

export const parseIntoQuotedString = (body): string => {
  let quotedStr = body
    .trim()
    .split('\n')
    .reduce((acc, line) => {
      return acc + `\n> ${line}`;
    });

  // Prepend '>' to account for the first line
  quotedStr = `> ${quotedStr}`;

  return quotedStr;
};

const parsePushEvent = async ({payload, keybaseUsername}): Promise<string> => {
  const ghUser = get(payload, 'sender.login', 'UNKNOWN');
  const commits = get(payload, 'commits', []);
  const branchRef = get(payload, 'ref', 'N/A');
  const url = await getShortenedUrl(get(payload, 'head_commit.url', 'N/A'));
  const forced = get(payload, 'forced', false);
  const forcedStr = forced ? '*force-pushed*' : '*pushed*';
  const userStr = keybaseUsername ? `User @${keybaseUsername}` : `GitHub user \`${ghUser}\``;
  const repo = get(payload, 'repository.full_name', 'n/a');

  // We only care about the first 40 chars of the commit messages
  const commitMsgLen = 40;
  const commitMessagesStr = commits
    .map(commit => {
      const msg = get(commit, 'message', '');
      const shortenedMsg = msg.substring(0, commitMsgLen);
      const msgStr = msg === shortenedMsg ? msg : `${shortenedMsg} ..`;
      return `- ${msgStr}`;
    })
    .reduce((acc, commit) => {
      return acc + `\n${commit}`;
    });
  const quotedCommitMessages = parseIntoQuotedString(commitMessagesStr);

  return `${userStr} ${forcedStr} ${commits.length} commit(s) to \`${branchRef}\` - ${url}\n> _repo: ${repo}_\n${quotedCommitMessages}`;
};

const parseRepoStarringEvent = ({payload, keybaseUsername}): string => {
  const ghUser = get(payload, 'sender.login', 'UNKNOWN');
  const repo = get(payload, 'repository.full_name', 'UNKNOWN');
  const userStr = keybaseUsername ? `@${keybaseUsername}` : `\`${ghUser}\``;
  return `Repository \`${repo}\` starred by ${userStr} :+1: :star:`;
};

const parsePullRequestEvent = async ({payload, keybaseUsername}): Promise<string> => {
  const ghUser = get(payload, 'sender.login', 'UNKNOWN');
  const url = await getShortenedUrl(get(payload, 'pull_request.html_url', 'N/A'));
  const num = get(payload, 'number', 'n/a');
  const title = get(payload, 'pull_request.title', 'N/A');
  const userStr = keybaseUsername ? `@${keybaseUsername}` : `GitHub user \`${ghUser}\``;
  const action = get(payload, 'action', null);
  const merged = get(payload, 'pull_request.merged', false);
  const body = get(payload, 'pull_request.body', '');
  const repo = get(payload, 'repository.full_name', 'n/a');
  const quotedBody = parseIntoQuotedString(body);
  const actionMap = {
    synchronize: '*updated*',
    opened: '*opened*',
    closed: merged ? '*merged*' : '*closed*',
    reopened: '*reopened*',
  };
  const actionStr = get(actionMap, action, 'n/a');
  return `PR #${num} ${actionStr} by ${userStr} - ${url}\n> _repo: ${repo}_\n> Title: *${title}*\n${quotedBody}`;
};

const parseCommitCommentEvent = async ({payload, keybaseUsername}): Promise<string> => {
  const ghUser = get(payload, 'sender.login', 'UNKNOWN');
  const repo = get(payload, 'repository.full_name', 'UNKNOWN');
  const userStr = keybaseUsername ? `@${keybaseUsername}` : `\`${ghUser}\``;
  const sha = getShortSHA(get(payload, 'comment.commit_id', 'n/a'));
  const url = await getShortenedUrl(get(payload, 'comment.html_url', 'N/A'));
  const body = get(payload, 'comment.body', '');
  const quotedBody = parseIntoQuotedString(body);
  return `New comment on \`${repo}@${sha}\` by ${userStr} - ${url}\n${quotedBody}`;
};

const parseIssuesEvent = async ({payload, keybaseUsername}): Promise<string> => {
  const ghUser = get(payload, 'sender.login', 'UNKNOWN');
  const url = await getShortenedUrl(get(payload, 'issue.html_url', 'N/A'));
  const userStr = keybaseUsername ? `@${keybaseUsername}` : `GitHub user \`${ghUser}\``;
  const repo = get(payload, 'repository.full_name', 'UNKNOWN');
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
  return `Issue #${issueNumber} ${actionStr} by ${userStr} - ${url}\n> _repo: ${repo}_\n> Title: *${issueTitle}*\n${quotedBody}`;
};

const parseIssueCommentEvent = async ({payload, keybaseUsername}): Promise<string> => {
  const ghUser = get(payload, 'sender.login', 'UNKNOWN');
  const url = await getShortenedUrl(get(payload, 'comment.html_url', 'N/A'));
  const userStr = keybaseUsername ? `@${keybaseUsername}` : `GitHub user \`${ghUser}\``;
  const action = get(payload, 'action', null);
  const repo = get(payload, 'repository.full_name', 'n/a');
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
  return `${actionStr} comment on Issue #${issueNumber} ${preposition} ${userStr}. ${url}\n> _repo: ${repo}_\n${quotedComment}`;
};

export const generateChatMessage = async ({context, keybaseUsername}): Promise<string> => {
  core.debug(`GitHub event: ${JSON.stringify(context)}`);
  if (get(context, 'eventName', null) === 'push') {
    return await parsePushEvent({payload: context.payload, keybaseUsername});
  }

  if (get(context, 'eventName', null) === 'watch') {
    return parseRepoStarringEvent({payload: context.payload, keybaseUsername});
  }

  if (get(context, 'eventName', null) === 'pull_request') {
    return await parsePullRequestEvent({payload: context.payload, keybaseUsername});
  }

  if (get(context, 'eventName', null) === 'commit_comment') {
    return await parseCommitCommentEvent({payload: context.payload, keybaseUsername});
  }

  if (get(context, 'eventName', null) === 'issues') {
    return await parseIssuesEvent({payload: context.payload, keybaseUsername});
  }

  if (get(context, 'eventName', null) === 'issue_comment') {
    return await parseIssueCommentEvent({payload: context.payload, keybaseUsername});
  }

  core.error('Ignoring this event as it is unsupported by this application.');
  return '';
};

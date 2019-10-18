import * as core from '@actions/core';
import * as OctokitWebhooks from '@octokit/webhooks';
import {get} from 'lodash';
import {getShortenedUrl} from './utils';
import {sync as commitParser} from 'conventional-commits-parser';
import defaultChangelogOpts from 'conventional-changelog-angular';
import {isBreakingChange, ParsedCommits, ParsedCommitsExtraCommit} from '../../automatic-releases/src/utils';

export const getShortSHA = (sha: string): string => {
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

const generateParsedCommits = (commits: ParsedCommitsExtraCommit[]): ParsedCommits[] => {
  const parsedCommits: ParsedCommits[] = [];

  for (const commit of commits) {
    core.debug(`Processing commit: ${JSON.stringify(commit)}`);
    const parsedCommitMsg = commitParser(commit.message, defaultChangelogOpts);
    parsedCommitMsg.extra = {
      commit: commit,
      pullRequests: [],
      breakingChange: false,
    };

    parsedCommitMsg.extra.breakingChange = isBreakingChange({
      body: parsedCommitMsg.body,
      footer: parsedCommitMsg.footer,
    });
    core.debug(`Parsed commit: ${JSON.stringify(parsedCommitMsg)}`);
    parsedCommits.push(parsedCommitMsg);
  }

  return parsedCommits;
};

const parsePushEvent = async (
  payload: OctokitWebhooks.WebhookPayloadPush,
  keybaseUsername: string,
): Promise<string> => {
  const url = await getShortenedUrl(get(payload, 'head_commit.url', ''));
  const forcedStr = payload.forced ? '*force-pushed*' : '*pushed*';
  const userStr = keybaseUsername ? `User @${keybaseUsername}` : `GitHub user \`${payload.sender.login}\``;

  const parsedCommits = generateParsedCommits(payload.commits);
  const commitMessagesStr = parsedCommits
    .map(commit => `- ${commit.header}`)
    .reduce((acc, commit) => {
      return acc + `\n${commit}`;
    }, '');
  const quotedCommitMessages = parseIntoQuotedString(commitMessagesStr);

  return `${userStr} ${forcedStr} ${payload.commits.length} commit(s) to \`${payload.ref}\` - ${url}\n> _repo: ${payload.repository.full_name}_\n${quotedCommitMessages}`;
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
    return await parsePushEvent(context.payload, keybaseUsername);
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

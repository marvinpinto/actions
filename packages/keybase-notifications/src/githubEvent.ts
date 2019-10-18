import * as core from '@actions/core';
import * as OctokitWebhooks from '@octokit/webhooks';
import {getShortenedUrl} from './utils';
import {sync as commitParser} from 'conventional-commits-parser';
import {getChangelogOptions} from '../../automatic-releases/src/utils';
import {isBreakingChange, ParsedCommits, ParsedCommitsExtraCommit} from '../../automatic-releases/src/utils';

type Override<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U;

type WebhookPayloadPush = Override<OctokitWebhooks.WebhookPayloadPush, {head_commit: ParsedCommitsExtraCommit}>;

export const getShortSHA = (sha: string): string => {
  const coreAbbrev = 7;
  return sha.substring(0, coreAbbrev);
};

export const parseIntoQuotedString = (body: string): string => {
  let quotedStr = body
    .trim()
    .split('\n')
    .reduce((acc, line) => {
      return acc + `\n> ${line}`;
    });

  // Return an empty body instead of an errant "empty quoted line"
  if (!quotedStr) {
    return '';
  }

  // Prepend '>' to account for the first line
  quotedStr = `> ${quotedStr}`;

  return quotedStr;
};

const generateParsedCommits = async (commits: ParsedCommitsExtraCommit[]): Promise<ParsedCommits[]> => {
  const parsedCommits: ParsedCommits[] = [];
  const clOptions = await getChangelogOptions();

  for (const commit of commits) {
    core.debug(`Processing commit: ${JSON.stringify(commit)}`);
    const parsedCommitMsg = commitParser(commit.message, clOptions);

    if (parsedCommitMsg.merge) {
      core.debug(`Ignoring merge commit: ${parsedCommitMsg.merge}`);
      continue;
    }

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

const parsePushEvent = async (payload: WebhookPayloadPush, keybaseUsername: string): Promise<string> => {
  const url = await getShortenedUrl(payload.head_commit.url);
  const forcedStr = payload.forced ? '*force-pushed*' : '*pushed*';
  const userStr = keybaseUsername ? `User @${keybaseUsername}` : `GitHub user \`${payload.sender.login}\``;

  const parsedCommits = await generateParsedCommits(payload.commits);
  const commitMessagesStr = parsedCommits
    .map(commit => `- ${commit.header}`)
    .reduce((acc, commit) => {
      return acc + `\n${commit}`;
    }, '');
  const quotedCommitMessages = parseIntoQuotedString(commitMessagesStr);

  return `${userStr} ${forcedStr} ${payload.commits.length} commit(s) to \`${payload.ref}\` - ${url}\n> _repo: ${payload.repository.full_name}_\n${quotedCommitMessages}`;
};

const parseRepoStarringEvent = (payload: OctokitWebhooks.WebhookPayloadStar, keybaseUsername: string): string => {
  const userStr = keybaseUsername ? `@${keybaseUsername}` : `\`${payload.sender.login}\``;
  return `Repository \`${payload.repository.full_name}\` starred by ${userStr} :+1: :star:`;
};

const parsePullRequestEvent = async (
  payload: OctokitWebhooks.WebhookPayloadPullRequest,
  keybaseUsername: string,
): Promise<string> => {
  const url = await getShortenedUrl(payload.pull_request.html_url);
  const userStr = keybaseUsername ? `@${keybaseUsername}` : `GitHub user \`${payload.sender.login}\``;
  const quotedBody = parseIntoQuotedString(payload.pull_request.body);
  const actionMap = {
    synchronize: '*updated*',
    opened: '*opened*',
    closed: payload.pull_request.merged ? '*merged*' : '*closed*',
    reopened: '*reopened*',
  };
  const actionStr = actionMap[payload.action];
  const quotedBodyStr = quotedBody ? `\n${quotedBody}` : '';
  return `PR #${payload.number} ${actionStr} by ${userStr} - ${url}\n> _repo: ${payload.repository.full_name}_\n> Title: *${payload.pull_request.title}*${quotedBodyStr}`;
};

const parseCommitCommentEvent = async (
  payload: OctokitWebhooks.WebhookPayloadCommitComment,
  keybaseUsername: string,
): Promise<string> => {
  const userStr = keybaseUsername ? `@${keybaseUsername}` : `\`${payload.sender.login}\``;
  const sha = getShortSHA(payload.comment.commit_id);
  const url = await getShortenedUrl(payload.comment.html_url);
  const quotedBody = parseIntoQuotedString(payload.comment.body);
  return `New comment on \`${payload.repository.full_name}@${sha}\` by ${userStr} - ${url}\n${quotedBody}`;
};

const parseIssuesEvent = async (
  payload: OctokitWebhooks.WebhookPayloadIssues,
  keybaseUsername: string,
): Promise<string> => {
  const url = await getShortenedUrl(payload.issue.html_url);
  const userStr = keybaseUsername ? `@${keybaseUsername}` : `GitHub user \`${payload.sender.login}\``;
  const quotedBody = parseIntoQuotedString(payload.issue.body);
  const actionMap = {
    opened: '*opened*',
    edited: '*updated*',
    closed: '*closed*',
    reopened: '*reopened*',
  };
  const actionStr = actionMap[payload.action];
  const quotedBodyStr = quotedBody ? `\n${quotedBody}` : '';
  return `Issue #${payload.issue.number} ${actionStr} by ${userStr} - ${url}\n> _repo: ${payload.repository.full_name}_\n> Title: *${payload.issue.title}*${quotedBodyStr}`;
};

const parseIssueCommentEvent = async (
  payload: OctokitWebhooks.WebhookPayloadIssueComment,
  keybaseUsername: string,
): Promise<string> => {
  const url = await getShortenedUrl(payload.comment.html_url);
  const userStr = keybaseUsername ? `@${keybaseUsername}` : `GitHub user \`${payload.sender.login}\``;
  const actionMap = {
    created: '*New*',
    edited: '*Updated*',
    deleted: '*Deleted*',
  };
  const actionStr = actionMap[payload.action];
  const preposition = payload.action === 'deleted' ? 'by' : 'from';
  const quotedComment = parseIntoQuotedString(payload.comment.body);
  return `${actionStr} comment on Issue #${payload.issue.number} ${preposition} ${userStr}. ${url}\n> _repo: ${payload.repository.full_name}_\n${quotedComment}`;
};

export const generateChatMessage = async ({context, keybaseUsername}): Promise<string> => {
  core.debug(`GitHub event: ${JSON.stringify(context)}`);
  switch (context.eventName) {
    case 'push':
      return await parsePushEvent(context.payload, keybaseUsername);
    case 'watch':
      return parseRepoStarringEvent(context.payload, keybaseUsername);
    case 'pull_request':
      return await parsePullRequestEvent(context.payload, keybaseUsername);
    case 'commit_comment':
      return await parseCommitCommentEvent(context.payload, keybaseUsername);
    case 'issues':
      return await parseIssuesEvent(context.payload, keybaseUsername);
    case 'issue_comment':
      return await parseIssueCommentEvent(context.payload, keybaseUsername);
    default:
      core.error('Ignoring this event as it is unsupported by this application.');
  }
  return '';
};

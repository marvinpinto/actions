import * as core from '@actions/core';
import {getShortSHA} from '../../keybase-notifications/src/githubEvent';
import * as Octokit from '@octokit/rest';
import defaultChangelogOpts from 'conventional-changelog-angular';

export type ParsedCommitsExtraCommit = Octokit.ReposCompareCommitsResponseCommitsItem & {
  author: {
    email: string;
    name: string;
    username: string;
  };
  committer: {
    email: string;
    name: string;
    username: string;
  };
  distinct: boolean;
  id: string;
  message: string;
  timestamp: string;
  tree_id: string;
  url: string;
};

type ParsedCommitsExtra = {
  commit: ParsedCommitsExtraCommit;
  pullRequests: {
    number: number;
    url: string;
  }[];
  breakingChange: boolean;
};

enum ConventionalCommitTypes {
  feat = 'Features',
  fix = 'Bug Fixes',
  docs = 'Documentation',
  style = 'Styles',
  refactor = 'Code Refactoring',
  perf = 'Performance Improvements',
  test = 'Tests',
  build = 'Builds',
  ci = 'Continuous Integration',
  chore = 'Chores',
  revert = 'Reverts',
}

export type ParsedCommits = {
  type: ConventionalCommitTypes;
  scope: string;
  subject: string;
  merge: string;
  header: string;
  body: string;
  footer: string;
  notes: {
    title: string;
    text: string;
  }[];
  extra: ParsedCommitsExtra;
  references: {
    action: string;
    owner: string;
    repository: string;
    issue: string;
    raw: string;
    prefix: string;
  }[];
  mentions: string[];
  revert: boolean;
};

const getFormattedChangelogEntry = (parsedCommit: ParsedCommits): string => {
  let entry = '';

  const url = parsedCommit.extra.commit.html_url;
  const sha = getShortSHA(parsedCommit.extra.commit.sha);
  const author = parsedCommit.extra.commit.commit.author.name;

  let prString = '';
  prString = parsedCommit.extra.pullRequests.reduce((acc, pr) => {
    // e.g. #1
    // e.g. #1,#2
    // e.g. ''
    if (acc) {
      acc += ',';
    }
    return `${acc}[#${pr.number}](${pr.url})`;
  }, '');
  if (prString) {
    prString = ' ' + prString;
  }

  entry = `- [[${sha}](${url})]: ${parsedCommit.header} (${author})${prString}`;
  if (parsedCommit.type) {
    const scopeStr = parsedCommit.scope ? `**${parsedCommit.scope}**: ` : '';
    entry = `- ${scopeStr}${parsedCommit.subject}${prString} ([${author}](${url}))`;
  }

  return entry;
};

export const generateChangelogFromParsedCommits = (parsedCommits: ParsedCommits[]): string => {
  let changelog = '';

  // Breaking Changes
  const breaking = parsedCommits
    .filter(val => val.extra.breakingChange === true)
    .map(val => getFormattedChangelogEntry(val))
    .reduce((acc, line) => `${acc}\n${line}`, '');
  if (breaking) {
    changelog += '\n\n## Breaking Changes\n';
    changelog += breaking;
  }

  for (const key of Object.keys(ConventionalCommitTypes)) {
    const clBlock = parsedCommits
      .filter(val => val.type === key)
      .map(val => getFormattedChangelogEntry(val))
      .reduce((acc, line) => `${acc}\n${line}`, '');
    if (clBlock) {
      changelog += `\n\n## ${ConventionalCommitTypes[key]}\n`;
      changelog += clBlock;
    }
  }

  // Commits
  const commits = parsedCommits
    .filter(val => val.type === null)
    .map(val => getFormattedChangelogEntry(val))
    .reduce((acc, line) => `${acc}\n${line}`, '');
  if (commits) {
    changelog += '\n\n## Commits\n';
    changelog += commits;
  }

  return changelog;
};

export const isBreakingChange = ({body, footer}): boolean => {
  const re = /^BREAKING\s+CHANGES?:\s+/;
  return re.test(body || '') || re.test(footer || '');
};

export const parseGitTag = (inputRef): string => {
  const re = /^refs\/tags\/(.*)$/;
  const resMatch = inputRef.match(re);
  if (!resMatch || !resMatch[1]) {
    core.debug(`Input "${inputRef}" does not appear to be a tag`);
    return '';
  }
  return resMatch[1];
};

export const getChangelogOptions = async () => {
  const defaultOpts = await defaultChangelogOpts;
  defaultOpts['mergePattern'] = '^Merge pull request #(.*) from (.*)$';
  defaultOpts['mergeCorrespondence'] = ['issueId', 'source'];
  core.debug(`Changelog options: ${JSON.stringify(defaultOpts)}`);
  return defaultOpts;
};

// istanbul ignore next
export const octokitLogger = (...args): string => {
  return args
    .map(arg => {
      if (typeof arg === 'string') {
        return arg;
      }

      // Do not log file buffers
      if (arg.file) {
        arg.file = '== raw file buffer info removed ==';
      }
      if (arg.data) {
        arg.data = '== raw file buffer info removed ==';
      }

      return JSON.stringify(arg);
    })
    .reduce((acc, val) => `${acc} ${val}`, '');
};

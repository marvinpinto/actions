import * as core from '@actions/core';
import {sync as commitParser} from 'conventional-commits-parser';
import * as github from '@actions/github';
import * as Octokit from '@octokit/rest';
import defaultChangelogOpts from 'conventional-changelog-angular/conventional-recommended-bump';

export const getShortSHA = (sha: string): string => {
  const coreAbbrev = 7;
  return sha.substring(0, coreAbbrev);
};

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

  entry = `- ${sha}: ${parsedCommit.header} (${author})${prString}`;
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
    .filter((val) => val.extra.breakingChange === true)
    .map((val) => getFormattedChangelogEntry(val))
    .reduce((acc, line) => `${acc}\n${line}`, '');
  if (breaking) {
    changelog += '## Breaking Changes\n';
    changelog += breaking.trim();
  }

  for (const key of Object.keys(ConventionalCommitTypes)) {
    const clBlock = parsedCommits
      .filter((val) => val.type === key)
      .map((val) => getFormattedChangelogEntry(val))
      .reduce((acc, line) => `${acc}\n${line}`, '');
    if (clBlock) {
      changelog += `\n\n## ${ConventionalCommitTypes[key]}\n`;
      changelog += clBlock.trim();
    }
  }

  // Commits
  const commits = parsedCommits
    .filter((val) => val.type === null || Object.keys(ConventionalCommitTypes).indexOf(val.type) === -1)
    .map((val) => getFormattedChangelogEntry(val))
    .reduce((acc, line) => `${acc}\n${line}`, '');
  if (commits) {
    changelog += '\n\n## Commits\n';
    changelog += commits.trim();
  }

  return changelog.trim();
};

export const isBreakingChange = ({body, footer}: {body: string; footer: string}): boolean => {
  const re = /^BREAKING\s+CHANGES?:\s+/;
  return re.test(body || '') || re.test(footer || '');
};

export const parseGitTag = (inputRef: string): string => {
  const re = /^(refs\/)?tags\/(.*)$/;
  const resMatch = inputRef.match(re);
  if (!resMatch || !resMatch[2]) {
    core.debug(`Input "${inputRef}" does not appear to be a tag`);
    return '';
  }
  return resMatch[2];
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const getChangelogOptions = async () => {
  const defaultOpts = defaultChangelogOpts;
  defaultOpts['mergePattern'] = '^Merge pull request #(.*) from (.*)$';
  defaultOpts['mergeCorrespondence'] = ['issueId', 'source'];
  core.debug(`Changelog options: ${JSON.stringify(defaultOpts)}`);
  return defaultOpts;
};

// istanbul ignore next
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const octokitLogger = (...args): string => {
  return args
    .map((arg) => {
      if (typeof arg === 'string') {
        return arg;
      }

      const argCopy = {...arg};

      // Do not log file buffers
      if (argCopy.file) {
        argCopy.file = '== raw file buffer info removed ==';
      }
      if (argCopy.data) {
        argCopy.data = '== raw file buffer info removed ==';
      }

      return JSON.stringify(argCopy);
    })
    .reduce((acc, val) => `${acc} ${val}`, '');
};

export const getChangelog = async (
  client: github.GitHub,
  owner: string,
  repo: string,
  commits: Octokit.ReposCompareCommitsResponseCommitsItem[],
): Promise<string> => {
  const parsedCommits: ParsedCommits[] = [];
  core.startGroup('Generating changelog');

  for (const commit of commits) {
    core.debug(`Processing commit: ${JSON.stringify(commit)}`);
    core.debug(`Searching for pull requests associated with commit ${commit.sha}`);
    const pulls = await client.repos.listPullRequestsAssociatedWithCommit({
      owner: owner,
      repo: repo,
      commit_sha: commit.sha,
    });
    if (pulls.data.length) {
      core.info(`Found ${pulls.data.length} pull request(s) associated with commit ${commit.sha}`);
    }

    const clOptions = await getChangelogOptions();
    const parsedCommitMsg = commitParser(commit.commit.message, clOptions);

    // istanbul ignore next
    if (parsedCommitMsg.merge) {
      core.debug(`Ignoring merge commit: ${parsedCommitMsg.merge}`);
      continue;
    }

    parsedCommitMsg.extra = {
      commit: commit,
      pullRequests: [],
      breakingChange: false,
    };

    parsedCommitMsg.extra.pullRequests = pulls.data.map((pr) => {
      return {
        number: pr.number,
        url: pr.html_url,
      };
    });

    parsedCommitMsg.extra.breakingChange = isBreakingChange({
      body: parsedCommitMsg.body,
      footer: parsedCommitMsg.footer,
    });
    core.debug(`Parsed commit: ${JSON.stringify(parsedCommitMsg)}`);
    parsedCommits.push(parsedCommitMsg);
    core.info(`Adding commit "${parsedCommitMsg.header}" to the changelog`);
  }

  const changelog = generateChangelogFromParsedCommits(parsedCommits);
  core.debug('Changelog:');
  core.debug(changelog);

  core.endGroup();
  return changelog;
};

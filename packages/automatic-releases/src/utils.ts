import {getShortSHA} from '../../keybase-notifications/src/githubEvent';

const getFormattedChangelogEntry = parsedCommit => {
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

export const generateChangelogFromParsedCommits = (parsedCommits): string => {
  let changelog = '';

  const conventionalCommitTypeHeader = {
    feat: 'Features',
    fix: 'Bug Fixes',
    docs: 'Documentation',
    style: 'Styles',
    refactor: 'Code Refactoring',
    perf: 'Performance Improvements',
    test: 'Tests',
    build: 'Builds',
    ci: 'Continuous Integration',
    chore: 'Chores',
    revert: 'Reverts',
  };

  // Breaking Changes
  const breaking = parsedCommits
    .filter(val => val.extra.breakingChange === true)
    .map(val => getFormattedChangelogEntry(val))
    .reduce((acc, line) => `${acc}\n${line}`, '');
  if (breaking) {
    changelog += '\n\n## Breaking Changes\n';
    changelog += breaking;
  }

  for (const key of Object.keys(conventionalCommitTypeHeader)) {
    const clBlock = parsedCommits
      .filter(val => val.type === key)
      .map(val => getFormattedChangelogEntry(val))
      .reduce((acc, line) => `${acc}\n${line}`, '');
    if (clBlock) {
      changelog += `\n\n## ${conventionalCommitTypeHeader[key]}\n`;
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

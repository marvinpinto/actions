import * as path from 'path';
import fs from 'fs';
import {getChangelog, generateChangelogFromParsedCommits, octokitLogger} from '../src/utils';

describe('changelog generator', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is able to process multiple types of commits', () => {
    const payload = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'payloads', 'parsed-commits-multiple.json'), 'utf8'),
    );
    const expected = fs.readFileSync(path.join(__dirname, 'payloads', 'parsed-commits-multiple-result.txt'), 'utf8');

    const result = generateChangelogFromParsedCommits(payload);
    expect(result.trim()).toEqual(expected.trim());
  });

  it('is able to process a single commit', () => {
    const payload = JSON.parse(fs.readFileSync(path.join(__dirname, 'payloads', 'parsed-commits-single.json'), 'utf8'));
    const expected = fs.readFileSync(path.join(__dirname, 'payloads', 'parsed-commits-single-result.txt'), 'utf8');

    const result = generateChangelogFromParsedCommits(payload);
    expect(result.trim()).toEqual(expected.trim());
  });

  it('is able to process a commit that belongs to multiple pull requests', () => {
    const payload = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'payloads', 'parsed-commits-multiple-prs.json'), 'utf8'),
    );
    const expected = fs.readFileSync(
      path.join(__dirname, 'payloads', 'parsed-commits-multiple-prs-result.txt'),
      'utf8',
    );

    const result = generateChangelogFromParsedCommits(payload);
    expect(result.trim()).toEqual(expected.trim());
  });

  it('is able to process a breaking changes commit', () => {
    const payload = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'payloads', 'parsed-commits-breaking-changes.json'), 'utf8'),
    );
    const expected = fs.readFileSync(
      path.join(__dirname, 'payloads', 'parsed-commits-breaking-changes-result.txt'),
      'utf8',
    );

    const result = generateChangelogFromParsedCommits(payload);
    expect(result.trim()).toEqual(expected.trim());
  });

  it('is able to process scoped conventional commits', () => {
    const payload = JSON.parse(fs.readFileSync(path.join(__dirname, 'payloads', 'parsed-commits-scoped.json'), 'utf8'));
    const expected = fs.readFileSync(path.join(__dirname, 'payloads', 'parsed-commits-scoped-result.txt'), 'utf8');

    const result = generateChangelogFromParsedCommits(payload);
    expect(result.trim()).toEqual(expected.trim());
  });

  it('is able to process commits that do not conform to the conventional commits standard', () => {
    const payload = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'payloads', 'parsed-commits-non-conforming.json'), 'utf8'),
    );
    const expected = fs.readFileSync(
      path.join(__dirname, 'payloads', 'parsed-commits-non-conforming-result.txt'),
      'utf8',
    );

    const result = generateChangelogFromParsedCommits(payload);
    expect(result.trim()).toEqual(expected.trim());
  });

  it('log of input arguments should not overwrite the original args', () => {
    const licenseFile = fs.readFileSync(path.join(__dirname, 'assets', 'LICENSE'), 'utf8');
    const jarFile = fs.readFileSync(path.join(__dirname, 'assets', 'test.jar'), 'utf8');

    const args = [
      {
        repoToken: 'repoToken',
        automaticReleaseTag: 'automaticReleaseTag',
        draftRelease: false,
        preRelease: false,
        releaseTitle: 'releaseTitle',
        file: licenseFile,
      },
      {
        repoToken: 'repoToken',
        automaticReleaseTag: 'automaticReleaseTag',
        draftRelease: false,
        preRelease: false,
        releaseTitle: 'releaseTitle',
        file: jarFile,
      },
    ];

    octokitLogger(...args);

    expect(args[0].file).toEqual('this should not be overridden');
    expect(args[1].file).toEqual('');
  });

  it('check if a changelog can be read from file', () => {
    const changeLogFile = path.join(__dirname, 'payloads', 'changelog-file.txt');
    const expected = fs.readFileSync(changeLogFile, 'utf8');
    return getChangelog(null, null, null, null, changeLogFile).then(result => {
      expect(result.trim()).toEqual(expected.trim());
    });
  });
});

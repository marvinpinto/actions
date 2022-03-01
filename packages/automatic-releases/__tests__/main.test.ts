/* eslint-disable @typescript-eslint/no-var-requires */
import * as path from 'path';
import fs from 'fs';
import {octokitLogger} from '../src/utils';
import {getChangelogWithOverrides, Args} from '../src/main';
import * as github from '@actions/github';
import * as core from '@actions/core';

describe('main handler', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is able to process a single commit without body override', async() => {
    const payload = JSON.parse(fs.readFileSync(path.join(__dirname, 'payloads', 'parsed-commits-single-without-body-override.json'), 'utf8'));
    const expected = fs.readFileSync(path.join(__dirname, 'payloads', 'parsed-commits-single-without-body-override-result.txt'), 'utf8');

    let args = {
      repoToken: 'test-token',
      automaticRelease: '',
      draftRelease: false.toString(),
      preRelease: false.toString(),
      releaseTitle: '',
      files: [],
      body: payload['body'] ? payload['body'] : '',
    } as Args;

    const client = new github.GitHub(args.repoToken, {
      baseUrl: process.env['JEST_MOCK_HTTP_PORT']
        ? `http://localhost:${process.env['JEST_MOCK_HTTP_PORT']}`
        : undefined,
      log: {
        debug: (...logArgs) => core.debug(octokitLogger(...logArgs)),
        info: (...logArgs) => core.debug(octokitLogger(...logArgs)),
        warn: (...logArgs) => core.warning(octokitLogger(...logArgs)),
        error: (...logArgs) => core.error(octokitLogger(...logArgs)),
      },
    });

    client.repos.listPullRequestsAssociatedWithCommit = async (): Promise<Octokit.Response<Octokit.ReposListPullRequestsAssociatedWithCommitResponse>> => {
      let data = [] as Octokit.ReposListPullRequestsAssociatedWithCommitResponse;
      let response = {
        data: data,
        status: 200,
        headers: {
          date: '',
          "x-ratelimit-limit": '',
          "x-ratelimit-remaining": '',
          "x-ratelimit-reset": '',
          "x-Octokit-request-id": '',
          "x-Octokit-media-type": '',
          link: '',
          "last-modified": '',
          etag: '',
          status: '',
        },
      } as Octokit.Response<Octokit.ReposListPullRequestsAssociatedWithCommitResponse>;
      return response;
    };

    const owner = 'marvinpinto';
    const repo = 'marvinpinto/private-actions-tester';
    //const commits_src = payload["commits"]["extra"]["commit"]
    let commit = payload["commits"]["extra"]["commit"] as Octokit.ReposCompareCommitsResponseCommitsItem;

    const commits = [commit,];

    const result = await getChangelogWithOverrides(
      args,
      client,
      owner,
      repo,
      commits,
    );
    expect(result.trim()).toEqual(expected.trim());
  });

  it('is able to process a single commit with body override', async() => {
    const payload = JSON.parse(fs.readFileSync(path.join(__dirname, 'payloads', 'parsed-commits-single-with-body-override.json'), 'utf8'));
    const expected = fs.readFileSync(path.join(__dirname, 'payloads', 'parsed-commits-single-with-body-override-result.txt'), 'utf8');

    let args = {
      repoToken: 'test-token',
      automaticRelease: '',
      draftRelease: false.toString(),
      preRelease: false.toString(),
      releaseTitle: '',
      files: [],
      body: payload['body'] ? payload['body'] : '',
    } as Args;

    const client = new github.GitHub(args.repoToken, {
      baseUrl: process.env['JEST_MOCK_HTTP_PORT']
        ? `http://localhost:${process.env['JEST_MOCK_HTTP_PORT']}`
        : undefined,
      log: {
        debug: (...logArgs) => core.debug(octokitLogger(...logArgs)),
        info: (...logArgs) => core.debug(octokitLogger(...logArgs)),
        warn: (...logArgs) => core.warning(octokitLogger(...logArgs)),
        error: (...logArgs) => core.error(octokitLogger(...logArgs)),
      },
    });

    client.repos.listPullRequestsAssociatedWithCommit = async (): Promise<Octokit.Response<Octokit.ReposListPullRequestsAssociatedWithCommitResponse>> => {
      let data = [] as Octokit.ReposListPullRequestsAssociatedWithCommitResponse;
      let response = {
        data: data,
        status: 200,
        headers: {
          date: '',
          "x-ratelimit-limit": '',
          "x-ratelimit-remaining": '',
          "x-ratelimit-reset": '',
          "x-Octokit-request-id": '',
          "x-Octokit-media-type": '',
          link: '',
          "last-modified": '',
          etag: '',
          status: '',
        },
      } as Octokit.Response<Octokit.ReposListPullRequestsAssociatedWithCommitResponse>;
      return response;
    };

    const owner = 'marvinpinto';
    const repo = 'marvinpinto/private-actions-tester';
    //const commits_src = payload["commits"]["extra"]["commit"]
    let commit = payload["commits"]["extra"]["commit"] as Octokit.ReposCompareCommitsResponseCommitsItem;

    const commits = [commit,];

    const result = await getChangelogWithOverrides(
      args,
      client,
      owner,
      repo,
      commits,
    );
    expect(result.trim()).toEqual(expected.trim());
  });

  it('throws an error when "repo_token" is not supplied', async () => {
    const inst = require('../src/main');
    await expect(inst.main()).rejects.toThrow('Input required and not supplied: repo_token');
  });
});

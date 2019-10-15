import * as core from '@actions/core';
import * as github from '@actions/github';
import * as Octokit from '@octokit/rest';
import {dumpGitHubEventPayload} from '../../keybase-notifications/src/utils';
import globby from 'globby';
import {lstatSync, readFileSync} from 'fs';
import path from 'path';
import md5File from 'md5-file/promise';
import {sync as commitParser} from 'conventional-commits-parser';
import defaultChangelogOpts from 'conventional-changelog-angular';
import {isBreakingChange, generateChangelogFromParsedCommits, parseGitTag} from './utils';
import semver from 'semver';

type Args = {
  repoToken: string;
  automaticReleaseTag: string;
  draftRelease: boolean;
  preRelease: boolean;
  releaseTitle: string;
  files: string[];
};

const getAndValidateArgs = (): Args => {
  const args = {
    repoToken: core.getInput('repo_token', {required: true}),
    automaticReleaseTag: core.getInput('automatic_release_tag', {required: false}),
    draftRelease: JSON.parse(core.getInput('draft', {required: true})),
    preRelease: JSON.parse(core.getInput('prerelease', {required: true})),
    releaseTitle: core.getInput('title', {required: false}),
    files: [] as string[],
  };

  const inputFilesStr = core.getInput('files', {required: false});
  if (inputFilesStr) {
    args.files = inputFilesStr.split(/\r?\n/);
  }

  return args;
};

const createReleaseTag = async (client: github.GitHub, refInfo: Octokit.GitCreateRefParams) => {
  core.startGroup('Generating release tag');
  const friendlyTagName = refInfo.ref.substring(10); // 'refs/tags/latest' => 'latest'
  core.info(`Attempting to create or update release tag "${friendlyTagName}"`);

  try {
    await client.git.createRef(refInfo);
  } catch (err) {
    const existingTag = refInfo.ref.substring(5); // 'refs/tags/latest' => 'tags/latest'
    core.info(
      `Could not create new tag "${refInfo.ref}" (${err.message}) therefore updating existing tag "${existingTag}"`,
    );
    await client.git.updateRef({
      ...refInfo,
      ref: existingTag,
      force: true,
    });
  }

  core.info(`Successfully created or updated the release tag "${friendlyTagName}"`);
  core.endGroup();
};

const deletePreviousGitHubRelease = async (client: github.GitHub, releaseInfo: Octokit.ReposGetReleaseByTagParams) => {
  core.startGroup(`Deleting GitHub releases associated with the tag "${releaseInfo.tag}"`);
  try {
    core.info(`Searching for releases corresponding to the "${releaseInfo.tag}" tag`);
    const resp = await client.repos.getReleaseByTag(releaseInfo);

    core.info(`Deleting release: ${resp.data.id}`);
    await client.repos.deleteRelease({
      owner: releaseInfo.owner,
      repo: releaseInfo.repo,
      release_id: resp.data.id, // eslint-disable-line @typescript-eslint/camelcase
    });
  } catch (err) {
    core.info(`Could not find release associated with tag "${releaseInfo.tag}" (${err.message})`);
  }
  core.endGroup();
};

const generateNewGitHubRelease = async (
  client: github.GitHub,
  releaseInfo: Octokit.ReposCreateReleaseParams,
): Promise<string> => {
  core.startGroup(`Generating new GitHub release for the "${releaseInfo.tag_name}" tag`);

  core.info('Creating new release');
  const resp = await client.repos.createRelease(releaseInfo);
  core.endGroup();
  return resp.data.upload_url;
};

// istanbul ignore next
export const uploadReleaseArtifacts = async (client: github.GitHub, uploadUrl: string, files: string[]) => {
  core.startGroup('Uploading release artifacts');
  const paths = await globby(files);

  for (const filePath of paths) {
    core.info(`Uploading: ${filePath}`);
    const nameWithExt = path.basename(filePath);
    const uploadArgs = {
      url: uploadUrl,
      headers: {
        'content-length': lstatSync(filePath).size,
        'content-type': 'application/octet-stream',
      },
      name: nameWithExt,
      file: readFileSync(filePath),
    };

    try {
      await client.repos.uploadReleaseAsset(uploadArgs);
    } catch (err) {
      core.info(
        `Problem uploading ${filePath} as a release asset (${err.message}). Will retry with the md5 hash appended to the filename.`,
      );
      const hash = await md5File(filePath);
      const basename = path.basename(filePath, path.extname(filePath));
      const ext = path.extname(filePath);
      const newName = ext ? `${basename}-${hash}.${ext}` : `${basename}-${hash}`;
      await client.repos.uploadReleaseAsset({
        ...uploadArgs,
        name: newName,
      });
    }
  }
  core.endGroup();
};

const searchForPreviousReleaseTag = async (
  client: github.GitHub,
  currentReleaseTag: string,
  tagInfo: Octokit.ReposListTagsParams,
): Promise<string> => {
  const validSemver = semver.valid(currentReleaseTag);
  if (!validSemver) {
    throw new Error(
      `The parameter "automatic_release_tag" was not set and the current tag "${currentReleaseTag}" does not appear to conform to semantic versioning.`,
    );
  }

  const listTagsOptions = client.repos.listTags.endpoint.merge(tagInfo);
  const tl = await client.paginate(listTagsOptions);

  const tagList = tl
    .map(tag => {
      core.debug(`Currently processing tag ${tag.name}`);
      const t = semver.valid(tag.name);
      return {
        ...tag,
        semverTag: t,
      };
    })
    .filter(tag => tag.semverTag !== null)
    .sort((a, b) => semver.rcompare(a.semverTag, b.semverTag));

  let previousReleaseTag = '';
  for (const tag of tagList) {
    if (semver.lt(tag.semverTag, currentReleaseTag)) {
      previousReleaseTag = tag.name;
      break;
    }
  }

  return previousReleaseTag;
};

const getCommitsSinceRelease = async (
  client: github.GitHub,
  tagInfo: Octokit.GitGetRefParams,
  currentSha: string,
): Promise<Octokit.ReposCompareCommitsResponseCommitsItem[]> => {
  core.startGroup('Retrieving commit history');

  core.info('Determining state of the previous release');
  let previousReleaseSha = '' as string;
  core.info(`Searching for SHA corresponding to current "${tagInfo.ref}" tag`);
  try {
    const resp = await client.git.getRef(tagInfo);
    previousReleaseSha = resp.data.object.sha;
  } catch (err) {
    core.info(
      `Could not find SHA corresponding to tag "${tagInfo.ref}" (${err.message}). Assuming this is the first release.`,
    );
    previousReleaseSha = 'HEAD';
  }

  core.info(`Retrieving commits between ${previousReleaseSha} and ${currentSha}`);
  const resp = await client.repos.compareCommits({
    owner: tagInfo.owner,
    repo: tagInfo.repo,
    base: previousReleaseSha,
    head: currentSha,
  });

  core.endGroup();
  return resp.data.commits;
};

const getChangelog = async (
  client: github.GitHub,
  owner: string,
  repo: string,
  commits: Octokit.ReposCompareCommitsResponseCommitsItem[],
): Promise<string> => {
  const parsedCommits: object[] = [];
  core.startGroup('Generating changelog');

  for (const commit of commits) {
    core.debug(`Processing commit: ${JSON.stringify(commit)}`);

    core.debug(`Searching for pull requests associated with commit ${commit.sha}`);
    const pulls = await client.repos.listPullRequestsAssociatedWithCommit({
      owner: owner,
      repo: repo,
      commit_sha: commit.sha, // eslint-disable-line @typescript-eslint/camelcase
    });
    if (pulls.data.length) {
      core.info(`Found ${pulls.data.length} pull request(s) associated with commit ${commit.sha}`);
    }

    const parsedCommitMsg = commitParser(commit.commit.message, defaultChangelogOpts);
    parsedCommitMsg.extra = {
      commit: commit,
      pullRequests: [],
      breakingChange: false,
    };

    parsedCommitMsg.extra.pullRequests = pulls.data.map(pr => {
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

export const main = async () => {
  try {
    const args = getAndValidateArgs();
    const client = new github.GitHub(args.repoToken);

    core.startGroup('Initializing the Automatic Releases action');
    dumpGitHubEventPayload();
    core.debug(`Github context: ${JSON.stringify(github.context)}`);
    core.endGroup();

    core.startGroup('Determining release tags');
    const releaseTag = args.automaticReleaseTag ? args.automaticReleaseTag : parseGitTag(github.context.ref);
    if (!releaseTag) {
      throw new Error(
        `The parameter "automatic_release_tag" was not set and this does not appear to be a GitHub tag event. (Event: ${github.context.ref})`,
      );
    }

    const previousReleaseTag = args.automaticReleaseTag
      ? args.automaticReleaseTag
      : await searchForPreviousReleaseTag(client, releaseTag, {
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
        });
    core.endGroup();

    const commitsSinceRelease = await getCommitsSinceRelease(
      client,
      {
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        ref: `tags/${previousReleaseTag}`,
      },
      github.context.sha,
    );

    const changelog = await getChangelog(
      client,
      github.context.repo.owner,
      github.context.repo.repo,
      commitsSinceRelease,
    );

    if (args.automaticReleaseTag) {
      await createReleaseTag(client, {
        owner: github.context.repo.owner,
        ref: `refs/tags/${args.automaticReleaseTag}`,
        repo: github.context.repo.repo,
        sha: github.context.sha,
      });

      await deletePreviousGitHubRelease(client, {
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        tag: args.automaticReleaseTag,
      });
    }

    const releaseUploadUrl = await generateNewGitHubRelease(client, {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      tag_name: releaseTag, // eslint-disable-line @typescript-eslint/camelcase
      name: args.automaticReleaseTag && args.releaseTitle ? args.releaseTitle : releaseTag,
      draft: args.draftRelease,
      prerelease: args.preRelease,
      body: changelog,
    });

    await uploadReleaseArtifacts(client, releaseUploadUrl, args.files);
  } catch (error) {
    core.setFailed(error.message);
    throw error;
  }
};

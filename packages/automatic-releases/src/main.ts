import * as core from '@actions/core';
import * as github from '@actions/github';
import * as Octokit from '@octokit/rest';
import {dumpGitHubEventPayload} from '../../keybase-notifications/src/utils';
import globby from 'globby';
import {lstatSync, readFileSync} from 'fs';
import path from 'path';
import md5File from 'md5-file/promise';

type Args = {
  repoToken: string;
  releaseTag: string;
  draftRelease: boolean;
  preRelease: boolean;
  releaseTitle: string;
  releaseBody: string;
  files: string[];
};

const getAndValidateArgs = (): Args => {
  const args = {
    repoToken: core.getInput('repo_token', {required: true}),
    releaseTag: core.getInput('release_tag', {required: true}),
    draftRelease: JSON.parse(core.getInput('draft', {required: true})),
    preRelease: JSON.parse(core.getInput('prerelease', {required: true})),
    releaseTitle: core.getInput('title', {required: true}),
    releaseBody: core.getInput('body', {required: false}),
    files: [] as string[],
  };

  const inputFilesStr = core.getInput('files', {required: false});
  if (inputFilesStr) {
    args.files = inputFilesStr.split(/\r?\n/);
  }

  if (!args.releaseBody) {
    args.releaseBody = `Automatically generated from the current master branch (${github.context.sha})`;
  }

  return args;
};

const createReleaseTag = async (client: github.GitHub, refInfo: Octokit.GitCreateRefParams) => {
  core.startGroup('Generating release tag');
  const friendlyTagName = refInfo.ref.substring(10); // 'refs/tags/latest' => 'latest'
  console.log(`Attempting to create or update release tag "${friendlyTagName}"`);

  try {
    await client.git.createRef(refInfo);
  } catch (err) {
    const existingTag = refInfo.ref.substring(5); // 'refs/tags/latest' => 'tags/latest'
    console.log(
      `Could not create new tag "${refInfo.ref}" (${err.message}) therefore updating existing tag "${existingTag}"`,
    );
    await client.git.updateRef({
      ...refInfo,
      ref: existingTag,
      force: true,
    });
  }

  console.log(`Successfully created or updated the release tag "${friendlyTagName}"`);
  core.endGroup();
};

const deletePreviousGitHubRelease = async (client: github.GitHub, releaseInfo: Octokit.ReposGetReleaseByTagParams) => {
  core.startGroup(`Deleting GitHub releases associated with the tag "${releaseInfo.tag}"`);
  try {
    console.log(`Searching for releases corresponding to the "${releaseInfo.tag}" tag`);
    const resp = await client.repos.getReleaseByTag(releaseInfo);

    console.log(`Deleting release: ${resp.data.id}`);
    await client.repos.deleteRelease({
      owner: releaseInfo.owner,
      repo: releaseInfo.repo,
      release_id: resp.data.id, // eslint-disable-line @typescript-eslint/camelcase
    });
  } catch (err) {
    console.log(`Could not find release associated with tag "${releaseInfo.tag}" (${err.message})`);
  }
  core.endGroup();
};

const generateNewGitHubRelease = async (
  client: github.GitHub,
  releaseInfo: Octokit.ReposCreateReleaseParams,
): Promise<string> => {
  core.startGroup(`Generating new GitHub release for the "${releaseInfo.tag_name}" tag`);

  console.log('Creating new release');
  const resp = await client.repos.createRelease(releaseInfo);
  core.endGroup();
  return resp.data.upload_url;
};

// istanbul ignore next
export const uploadReleaseArtifacts = async (client: github.GitHub, uploadUrl: string, files: string[]) => {
  core.startGroup('Uploading release artifacts');
  const paths = await globby(files);

  for (const filePath of paths) {
    console.log(`Uploading: ${filePath}`);
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
      console.log(
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

export async function main() {
  try {
    const args = getAndValidateArgs();
    const client = new github.GitHub(args.repoToken);

    core.startGroup('Initializing the Automatic Releases action');
    dumpGitHubEventPayload();
    core.endGroup();

    await createReleaseTag(client, {
      owner: github.context.repo.owner,
      ref: `refs/tags/${args.releaseTag}`,
      repo: github.context.repo.repo,
      sha: github.context.sha,
    });

    await deletePreviousGitHubRelease(client, {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      tag: args.releaseTag,
    });

    const releaseUploadUrl = await generateNewGitHubRelease(client, {
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      tag_name: args.releaseTag, // eslint-disable-line @typescript-eslint/camelcase
      name: args.releaseTitle,
      draft: args.draftRelease,
      prerelease: args.preRelease,
      body: args.releaseBody,
    });

    await uploadReleaseArtifacts(client, releaseUploadUrl, args.files);
  } catch (error) {
    core.setFailed(error.message);
    throw error;
  }
}

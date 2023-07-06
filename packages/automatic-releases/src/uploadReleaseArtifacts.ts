import * as core from '@actions/core';
import globby from 'globby';
import {lstatSync, readFileSync} from 'fs';
import path from 'path';
import md5File from 'md5-file';

import type {GitHub, UploadReleaseAssetParameters} from './utils';

export const uploadReleaseArtifacts = async (
  client: GitHub,
  params: Pick<UploadReleaseAssetParameters, 'owner' | 'repo' | 'release_id'>,
  files: string[],
): Promise<void> => {
  core.startGroup('Uploading release artifacts');
  for (const fileGlob of files) {
    const paths = await globby(fileGlob);
    if (paths.length == 0) {
      core.error(`${fileGlob} doesn't match any files`);
    }

    for (const filePath of paths) {
      core.info(`Uploading: ${filePath}`);
      const nameWithExt = path.basename(filePath);
      const uploadArgs = {
        ...params,
        headers: {
          'content-length': lstatSync(filePath).size,
          'content-type': 'application/octet-stream',
        },
        name: nameWithExt,
        data: readFileSync(filePath, 'utf8'),
      } as UploadReleaseAssetParameters;

      try {
        await client.rest.repos.uploadReleaseAsset(uploadArgs);
      } catch (err: any) {
        core.info(
          `Problem uploading ${filePath} as a release asset (${err.message}). Will retry with the md5 hash appended to the filename.`,
        );
        const hash = await md5File(filePath);
        const basename = path.basename(filePath, path.extname(filePath));
        const ext = path.extname(filePath);
        const newName = `${basename}-${hash}${ext}`;
        await client.rest.repos.uploadReleaseAsset({
          ...uploadArgs,
          name: newName,
        });
      }
    }
  }
  core.endGroup();
};

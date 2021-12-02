import * as core from '@actions/core';
import * as github from '@actions/github';
import globby from 'globby';
import {lstatSync, readFileSync} from 'fs';
import path from 'path';
import md5File from 'md5-file';

export const uploadReleaseArtifacts = async (
  client: github.GitHub,
  uploadUrl: string,
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
        let newName = ext ? `${basename}-${hash}.${ext}` : `${basename}-${hash}`;
        try {
          await client.repos.uploadReleaseAsset({
            ...uploadArgs,
            name: newName,
          });
        } catch (err) {
          const attempts = 5;
          let i = 0;
          let error;
          do {
            i++;
            error = false;
            core.info(
              `Problem uploading ${filePath} as a release asset (${err.message}). Will retry with the md5 hash appended to the filename plus a digit (attempt ${i}).`,
            );
            newName = ext ? `${basename}-${hash}-${i}.${ext}` : `${basename}-${hash}-${i}`;
            if (i >= attempts) {
              await client.repos.uploadReleaseAsset({
                ...uploadArgs,
                name: newName,
              });
            } else {
              try {
                await client.repos.uploadReleaseAsset({
                  ...uploadArgs,
                  name: newName,
                });
              } catch (err) {
                error = true;
              }
            }
          } while (error && i < attempts);
        }
      }
    }
  }
  core.endGroup();
};

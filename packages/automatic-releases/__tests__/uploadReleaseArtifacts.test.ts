import path from 'path';
import {lstatSync, readFileSync} from 'fs';
import md5File from 'md5-file';

const releaseUploadUrl = 'https://releaseupload.example.com';

const constructUploadArgs = (filePath: string, releaseUploadUrl: string) => ({
  url: releaseUploadUrl,
  headers: {
    'content-length': lstatSync(filePath).size,
    'content-type': 'application/octet-stream',
  },
  name: path.basename(filePath),
  file: readFileSync(filePath),
});

const constructUploadArgsWithMd5 = async (filePath: string, releaseUploadUrl: string) => {
  const ext = path.extname(filePath);
  const basename = path.basename(filePath, ext);
  const hash = await md5File(filePath);
  return {
    ...constructUploadArgs(filePath, releaseUploadUrl),
    name: `${basename}-${hash}${ext}`,
  };
};

describe('uploadReleaseArtifacts handler', () => {
  describe('when processing various file lists', () => {
    let github: any;
    let core: any;
    let uploadReleaseArtifacts: any;

    beforeAll(() => {
      jest.resetModules();

      jest.doMock('@actions/github', () => {
        const module = jest.createMockFromModule<any>('@actions/github');
        module.GitHub.prototype.repos.uploadReleaseAsset = jest.fn();
        return module;
      });
      jest.doMock('@actions/core', () => ({
        ...jest.createMockFromModule<any>('@actions/core'),
        error: jest.fn(),
      }));

      github = require('@actions/github');
      core = require('@actions/core');
      ({uploadReleaseArtifacts} = require('../src/uploadReleaseArtifacts'));
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('throws as nothing found, if "input.files" is ["assets/*.txt", "assets/*.md"]', async () => {
      const testInputFiles = [
        path.join(__dirname, 'assets/*.txt'),
        path.join(__dirname, 'assets/*.md'),
      ];
      const missingFiles = [
        path.join(__dirname, 'assets/*.txt'),
        path.join(__dirname, 'assets/*.md'),
      ];

      await expect(uploadReleaseArtifacts(new github.GitHub(undefined), releaseUploadUrl, testInputFiles)).rejects.toThrow(
        `No file matched by the glob pattern: ["${missingFiles[0]}", "${missingFiles[1]}"]`,
      );

      expect(github.GitHub.prototype.repos.uploadReleaseAsset).toHaveBeenCalledTimes(0);

      expect(core.error).toHaveBeenCalledTimes(2);
      expect(core.error.mock.calls[0][0]).toStrictEqual(`${missingFiles[0]} doesn't match any files`);
      expect(core.error.mock.calls[1][0]).toStrictEqual(`${missingFiles[1]} doesn't match any files`);
    });

    it('should upload "LICENSE", if "input.files" is ["assets/*.txt", "assets/LICENSE"]', async () => {
      const testInputFiles = [
        path.join(__dirname, 'assets/*.txt'),
        path.join(__dirname, 'assets/LICENSE'),
      ];
      const actualFoundFiles = [
        path.join(__dirname, 'assets/LICENSE'),
      ];
      const missingFiles = [
        path.join(__dirname, 'assets/*.txt'),
      ];

      await uploadReleaseArtifacts(new github.GitHub(undefined), releaseUploadUrl, testInputFiles);

      expect(github.GitHub.prototype.repos.uploadReleaseAsset).toHaveBeenCalledTimes(1);
      expect(github.GitHub.prototype.repos.uploadReleaseAsset.mock.calls[0][0]).toStrictEqual(constructUploadArgs(actualFoundFiles[0], releaseUploadUrl));

      expect(core.error).toHaveBeenCalledTimes(1);
      expect(core.error.mock.calls[0][0]).toStrictEqual(`${missingFiles[0]} doesn't match any files`);
    });

    it('should upload "LICENSE", if "input.files" is ["assets/LICENSE", "assets/*.txt"]', async () => {
      const testInputFiles = [
        path.join(__dirname, 'assets/LICENSE'),
        path.join(__dirname, 'assets/*.txt'),
      ];
      const actualFoundFiles = [
        path.join(__dirname, 'assets/LICENSE'),
      ];
      const missingFiles = [
        path.join(__dirname, 'assets/*.txt'),
      ];

      await uploadReleaseArtifacts(new github.GitHub(undefined), releaseUploadUrl, testInputFiles);

      expect(github.GitHub.prototype.repos.uploadReleaseAsset).toHaveBeenCalledTimes(1);
      expect(github.GitHub.prototype.repos.uploadReleaseAsset.mock.calls[0][0]).toStrictEqual(constructUploadArgs(actualFoundFiles[0], releaseUploadUrl));

      expect(core.error).toHaveBeenCalledTimes(1);
      expect(core.error.mock.calls[0][0]).toStrictEqual(`${missingFiles[0]} doesn't match any files`);
    });

    it('should upload "LICENSE" and "test.jar", if "input.files" is ["assets/LICENSE", "assets/*.jar"]', async () => {
      const testInputFiles = [
        path.join(__dirname, 'assets/LICENSE'),
        path.join(__dirname, 'assets/*.jar'),
      ];
      const actualFoundFiles = [
        path.join(__dirname, 'assets/LICENSE'),
        path.join(__dirname, 'assets/test.jar'),
      ];

      await uploadReleaseArtifacts(new github.GitHub(undefined), releaseUploadUrl, testInputFiles);

      expect(github.GitHub.prototype.repos.uploadReleaseAsset).toHaveBeenCalledTimes(2);
      expect(github.GitHub.prototype.repos.uploadReleaseAsset.mock.calls[0][0]).toStrictEqual(constructUploadArgs(actualFoundFiles[0], releaseUploadUrl));
      expect(github.GitHub.prototype.repos.uploadReleaseAsset.mock.calls[1][0]).toStrictEqual(constructUploadArgs(actualFoundFiles[1], releaseUploadUrl));

      expect(core.error).toHaveBeenCalledTimes(0);
    });

    it('should upload "LICENSE" and "test.jar", if "input.files" is ["assets/*"]', async () => {
      const testInputFiles = [
        path.join(__dirname, 'assets/*'),
      ];
      const actualFoundFiles = [
        path.join(__dirname, 'assets/LICENSE'),
        path.join(__dirname, 'assets/test.jar'),
      ];

      await uploadReleaseArtifacts(new github.GitHub(undefined), releaseUploadUrl, testInputFiles);

      expect(github.GitHub.prototype.repos.uploadReleaseAsset).toHaveBeenCalledTimes(2);
      expect(github.GitHub.prototype.repos.uploadReleaseAsset.mock.calls[0][0]).toStrictEqual(constructUploadArgs(actualFoundFiles[0], releaseUploadUrl));
      expect(github.GitHub.prototype.repos.uploadReleaseAsset.mock.calls[1][0]).toStrictEqual(constructUploadArgs(actualFoundFiles[1], releaseUploadUrl));

      expect(core.error).toHaveBeenCalledTimes(0);
    });
  });

  describe('when "client.repos.uploadReleaseAsset()" fails 1 time per file', () => {
    let github: any;
    let core: any;
    let uploadReleaseArtifacts: any;

    beforeEach(() => {
      jest.clearAllMocks();
      jest.resetModules();

      jest.doMock('@actions/github', () => {
        const module = jest.createMockFromModule<any>('@actions/github');
        module.GitHub.prototype.repos.uploadReleaseAsset = jest
          .fn()
          .mockRejectedValueOnce(new Error('upload failed 0'))
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error('upload failed 1'))
          .mockResolvedValueOnce(undefined);
        return module;
      });
      jest.doMock('@actions/core', () => ({
        ...jest.createMockFromModule<any>('@actions/core'),
        info: jest.fn(),
      }));

      github = require('@actions/github');
      core = require('@actions/core');
      ({uploadReleaseArtifacts} = require('../src/uploadReleaseArtifacts'));
    });

    it('should retry to upload "LICENSE" and "test.jar" with md5 hash appended', async () => {
      const testInputFiles = [
        path.join(__dirname, 'assets/LICENSE'),
        path.join(__dirname, 'assets/test.jar'),
      ];

      await uploadReleaseArtifacts(new github.GitHub(undefined), releaseUploadUrl, testInputFiles);

      expect(core.info).toHaveBeenCalledTimes(4);
      expect(core.info.mock.calls[0][0]).toStrictEqual(
        `Uploading: ${testInputFiles[0]}`
      );
      expect(core.info.mock.calls[1][0]).toStrictEqual(
        `Problem uploading ${testInputFiles[0]} as a release asset (${'upload failed 0'}). Will retry with the md5 hash appended to the filename.`
      );
      expect(core.info.mock.calls[2][0]).toStrictEqual(
        `Uploading: ${testInputFiles[1]}`
      );
      expect(core.info.mock.calls[3][0]).toStrictEqual(
        `Problem uploading ${testInputFiles[1]} as a release asset (${'upload failed 1'}). Will retry with the md5 hash appended to the filename.`
      );

      expect(github.GitHub.prototype.repos.uploadReleaseAsset).toHaveBeenCalledTimes(4);
      expect(github.GitHub.prototype.repos.uploadReleaseAsset.mock.calls[0][0]).toStrictEqual(constructUploadArgs(testInputFiles[0], releaseUploadUrl));
      expect(github.GitHub.prototype.repos.uploadReleaseAsset.mock.calls[1][0]).toStrictEqual(await constructUploadArgsWithMd5(testInputFiles[0], releaseUploadUrl));
      expect(github.GitHub.prototype.repos.uploadReleaseAsset.mock.calls[2][0]).toStrictEqual(constructUploadArgs(testInputFiles[1], releaseUploadUrl));
      expect(github.GitHub.prototype.repos.uploadReleaseAsset.mock.calls[3][0]).toStrictEqual(await constructUploadArgsWithMd5(testInputFiles[1], releaseUploadUrl));
    });
  });
});

import express from 'express';
import path from 'path';
import fs from 'fs';

const server = express();

const testGhToken = 'fake-secret-token';
const testGhSHA = 'f6f40d9fbd1130f7f2357bb54225567dbd7a3793';
const testInputDraft = false;
const testInputPrerelease = true;
const testInputDeleteExistTag = true;
const testInputFiles = 'file1.txt\nfile2.txt\n*.jar\n\n';

server.get(`/repos/marvinpinto/private-actions-tester/tags`, (req, res) => {
  res.json([
    {
      name: 'v0.0.0',
      commit: {
        sha: 'c5b97d5ae6c19d5c5df71a34c7fbeeda2479ccbc',
        url: 'https://api.github.com/repos/octocat/Hello-World/commits/c5b97d5ae6c19d5c5df71a34c7fbeeda2479ccbc',
      },
      zipball_url: 'https://github.com/octocat/Hello-World/zipball/v0.0.0',
      tarball_url: 'https://github.com/octocat/Hello-World/tarball/v0.0.0',
    },
    {
      name: 'v0.1',
      commit: {
        sha: 'c5b97d5ae6c19d5c5df71a34c7fbeeda2479aaaa',
        url: 'https://api.github.com/repos/octocat/Hello-World/commits/c5b97d5ae6c19d5c5df71a34c7fbeeda2479aaaa',
      },
      zipball_url: 'https://github.com/octocat/Hello-World/zipball/v0.1',
      tarball_url: 'https://github.com/octocat/Hello-World/tarball/v0.1',
    },
    {
      name: 'v0.0.1',
      commit: {
        sha: 'c5b97d5ae6c19d5c5df71a34c7fbeeda2479nnnn',
        url: 'https://api.github.com/repos/octocat/Hello-World/commits/c5b97d5ae6c19d5c5df71a34c7fbeeda2479nnnn',
      },
      zipball_url: 'https://github.com/octocat/Hello-World/zipball/v0.0.1',
      tarball_url: 'https://github.com/octocat/Hello-World/tarball/v0.0.1',
    },
  ]);
});

server.get(`/repos/marvinpinto/private-actions-tester/compare/HEAD...${testGhSHA}`, (req, res) => {
  const compareCommitsPayload = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../payloads', 'compare-commits.json'), 'utf8'),
  );
  res.json(compareCommitsPayload);
});

server.get(`/repos/marvinpinto/private-actions-tester/commits/${testGhSHA}/pulls`, (req, res) => {
  res.json([]);
});

server.post('/repos/marvinpinto/private-actions-tester/releases', (req, res) => {
  const releaseUploadUrl = 'https://releaseupload.example.com';
  res.json({
    upload_url: releaseUploadUrl,
  });
});

export const setupEnv = {
  INPUT_REPO_TOKEN: testGhToken,
  INPUT_DRAFT: testInputDraft.toString(),
  INPUT_PRERELEASE: testInputPrerelease.toString(),
  INPUT_FILES: testInputFiles,
  INPUT_DELETE_EXIST_TAG: testInputDeleteExistTag.toString(),

  GITHUB_EVENT_NAME: 'push',
  GITHUB_SHA: testGhSHA,
  GITHUB_REF: 'refs/tags/v0.0.1',
  GITHUB_WORKFLOW: 'keybase',
  GITHUB_ACTION: 'self',
  GITHUB_ACTOR: 'marvinpinto',
  GITHUB_EVENT_PATH: path.join(__dirname, '../payloads', 'git-push.json'),
  GITHUB_REPOSITORY: 'marvinpinto/private-actions-tester',
};

export {server};

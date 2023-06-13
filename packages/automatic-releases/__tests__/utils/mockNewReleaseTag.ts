import express from 'express';
import path from 'path';
import fs from 'fs';

const server = express();

const testGhToken = 'fake-secret-token';
const testGhSHA = 'f6f40d9fbd1130f7f2357bb54225567dbd7a3793';
const testInputAutomaticReleaseTag = 'testingtaglatest';
const testInputDraft = false;
const testInputPrerelease = true;
const testInputTitle = 'Development Build';
const testInputFiles = 'file1.txt\nfile2.txt\n*.jar\n\n';
const testInputAutoGenerateReleaseNotes = false;

server.get(`/repos/marvinpinto/private-actions-tester/compare/HEAD...${testGhSHA}`, (req, res) => {
  const compareCommitsPayload = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../payloads', 'compare-commits.json'), 'utf8'),
  );
  res.json(compareCommitsPayload);
});

server.get(`/repos/marvinpinto/private-actions-tester/commits/${testGhSHA}/pulls`, (req, res) => {
  res.json([]);
});

server.post('/repos/marvinpinto/private-actions-tester/git/refs', (req, res) => {
  res.json({});
});

server.get(`/repos/marvinpinto/private-actions-tester/releases/tags/${testInputAutomaticReleaseTag}`, (req, res) => {
  res.status(400).json({});
});

server.delete('/', (req, res) => {
  res.json({});
});

server.post('/repos/marvinpinto/private-actions-tester/releases', (req, res) => {
  const releaseUploadUrl = 'https://releaseupload.example.com';
  res.json({
    upload_url: releaseUploadUrl,
  });
});

export const setupEnv = {
  INPUT_REPO_TOKEN: testGhToken,
  INPUT_AUTOMATIC_RELEASE_TAG: testInputAutomaticReleaseTag,
  INPUT_DRAFT: testInputDraft.toString(),
  INPUT_PRERELEASE: testInputPrerelease.toString(),
  INPUT_TITLE: testInputTitle,
  INPUT_FILES: testInputFiles,
  INPUT_AUTO_GENERATE_RELEASE_NOTES: testInputAutoGenerateReleaseNotes.toString(),

  GITHUB_EVENT_NAME: 'push',
  GITHUB_SHA: testGhSHA,
  GITHUB_REF: 'refs/heads/automatic-pre-releaser',
  GITHUB_WORKFLOW: 'keybase',
  GITHUB_ACTION: 'self',
  GITHUB_ACTOR: 'marvinpinto',
  GITHUB_EVENT_PATH: path.join(__dirname, '../payloads', 'git-push.json'),
  GITHUB_REPOSITORY: 'marvinpinto/private-actions-tester',
};

export {server};

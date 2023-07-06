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

const previousReleaseSHA = '4398ef4ea6f5a61880ca94ecfb8e60d1a38497dd';
const foundReleaseId = 1235523222;

server.get(`/repos/Enase/private-actions-tester/git/refs/tags/${testInputAutomaticReleaseTag}`, (req, res) => {
  res.json({
    sha: previousReleaseSHA,
  });
});

server.get(`/repos/Enase/private-actions-tester/compare/${testInputAutomaticReleaseTag}...${testGhSHA}`, (req, res) => {
  const compareCommitsPayload = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../payloads', 'compare-commits.json'), 'utf8'),
  );
  res.json(compareCommitsPayload);
});

server.get(`/repos/Enase/private-actions-tester/commits/${testGhSHA}/pulls`, (req, res) => {
  res.json([{number: '22', html_url: 'https://example.com/PR22'}]);
});

server.post('/repos/Enase/private-actions-tester/git/refs', (req, res) => {
  res.status(400).json({});
});

server.patch(`/repos/Enase/private-actions-tester/git/refs/tags/${testInputAutomaticReleaseTag}`, (req, res) => {
  res.json({});
});

server.get(`/repos/Enase/private-actions-tester/releases/tags/${testInputAutomaticReleaseTag}`, (req, res) => {
  res.json({
    id: foundReleaseId,
  });
});

server.delete(`/repos/Enase/private-actions-tester/releases/${foundReleaseId}`, (req, res) => {
  res.json({});
});

server.post('/repos/Enase/private-actions-tester/releases', (req, res) => {
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

  GITHUB_EVENT_NAME: 'push',
  GITHUB_SHA: testGhSHA,
  GITHUB_REF: 'refs/heads/automatic-pre-releaser',
  GITHUB_WORKFLOW: 'keybase',
  GITHUB_ACTION: 'self',
  GITHUB_ACTOR: 'Enase',
  GITHUB_EVENT_PATH: path.join(__dirname, '../payloads', 'git-push.json'),
  GITHUB_REPOSITORY: 'Enase/private-actions-tester',
};

export {server};
